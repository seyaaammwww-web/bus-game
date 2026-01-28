import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const config = {
    apiKey: process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY,
    modelName: process.env.GEMINI_MODEL_NAME || process.env.GEMINIMODEL || 'gemini-1.5-flash',
};

interface CacheEntry {
    result: { isValid: boolean; reason: string; isFabricated: boolean };
    timestamp: number;
    hits: number;
}

export class AIValidator {
    private static instance: AIValidator;
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    private cache = new Map<string, CacheEntry>();
    private maxCacheSize = 5000;
    private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

    // Rate limiting system
    private lastRequestTime = 0;
    private minRequestInterval = 1000; // 1 second minimum between requests (reduced from 2s)
    private isProcessing = false;
    private requestQueue: Array<{
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
        task: () => Promise<any>;
    }> = [];

    // Batch accumulation for efficiency
    private pendingBatch: Array<{ playerId: string, category: string, letter: string, answer: string }> = [];
    private batchTimeout: NodeJS.Timeout | null = null;
    private batchWaitTime = 500; // Wait max 500ms for batch to accumulate

    private metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        rateLimitHits: 0,
        startTime: Date.now()
    };

    private constructor() {
        if (config.apiKey) {
            this.genAI = new GoogleGenerativeAI(config.apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: config.modelName,
                generationConfig: {
                    temperature: 0.0, // Strict, no creativity
                    responseMimeType: "application/json" // Force JSON output
                }
            });
            console.log("AI Validator initialized with model:", config.modelName, "(Strict JSON Mode)");
        } else {
            console.warn("Gemini API key is missing. AI validation will strictly fall back to rules/stub.");
        }
    }

    static getInstance(): AIValidator {
        if (!AIValidator.instance) {
            AIValidator.instance = new AIValidator();
        }
        return AIValidator.instance;
    }

    private getFromCache(key: string): { isValid: boolean; reason: string; isFabricated: boolean } | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        this.metrics.cacheHits++;
        console.log(`[AI Cache] Hit #${entry.hits + 1} for ${key}`);
        entry.hits++;
        return entry.result;
    }

    private setCache(key: string, result: { isValid: boolean; reason: string; isFabricated: boolean }): void {
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            hits: 0
        });
    }

    private generatePrompt(category: string, letter: string, answer: string): string {
        return `أنت حكم صارم في لعبة عربية اسمها "باص كامل". 
مهمتك: تقييم إذا كانت الإجابة "${answer}" صحيحة للفئة "${category}" وتبدأ بالحرف "${letter}".

**القواعد الصارمة:**
1. الحرف الأول: يجب أن يبدأ بالحرف "${letter}" (ا، أ، إ، آ = نفس الحرف)
2. الفئة: يجب أن تنتمي الإجابة للفئة "${category}" بدقة
3. ممنوع الهبد: رفض أي كلمة غير حقيقية أو مخترعة
4. اللغة: استخدم اللغة العربية الفصحى فقط

**أمثلة للرفض:**
- "ضب" في فئة "جماد" → خطأ (ضب حيوان)
- "خخب" في فئة "بلد" → خطأ (هبد)
- "صولا" في فئة "بنت" → خطأ (اسم فنانة، ليس اسم بنت شائع)

**أجب بتنسيق JSON فقط بدون أي نص إضافي أو تفسير:**
{
  "isValid": true/false,
  "reason": "سبب الرفض أو القبول بجملة قصيرة بالعربية",
  "isFabricated": true/false
}`;
    }

    async validateBatch(
        validations: Array<{ category: string, letter: string, answer: string }>
    ): Promise<Array<{ isValid: boolean; reason: string; isFabricated: boolean } | null>> {

        const results: Array<{ isValid: boolean; reason: string; isFabricated: boolean } | null> = [];
        const toValidate: Array<{ index: number, category: string, letter: string, answer: string }> = [];

        validations.forEach((validation, index) => {
            if (!validation.answer || !validation.answer.trim()) {
                results[index] = { isValid: false, reason: "إجابة فارغة", isFabricated: false }; // Handle empty answers immediately
                return;
            }
            if (validation.answer.trim().length < 2) {
                results[index] = { isValid: false, reason: "إجابة قصيرة جداً", isFabricated: false }; // Handle short answers immediately
                return;
            }
            const cacheKey = `${validation.category}:${validation.letter}:${validation.answer.trim().toLowerCase()}`;
            const cached = this.getFromCache(cacheKey);

            if (cached) {
                results[index] = cached;
            } else {
                toValidate.push({ index, ...validation });
                this.metrics.cacheMisses++;
            }
        });

        if (toValidate.length > 0) {
            const batchResults = await this.processBatch(toValidate);
            batchResults.forEach((result, i) => {
                const { index, ...validation } = toValidate[i];
                results[index] = result;

                if (result) {
                    const cacheKey = `${validation.category}:${validation.letter}:${validation.answer.trim().toLowerCase()}`;
                    this.setCache(cacheKey, result);
                }
            });
        }

        return results;
    }

    private async processBatch(
        validations: Array<{ category: string, letter: string, answer: string }>
    ): Promise<Array<{ isValid: boolean; reason: string; isFabricated: boolean } | null>> {

        if (!this.model) {
            return validations.map(() => null);
        }

        const batchPrompt = `
Task: Analyze the following validity of Arabic words for the game Scattergories (Bus Complete).
Input Data:
${validations.map((v, i) => `Item ${i}: Letter='${v.letter}', Category='${v.category}', Answer='${v.answer}'`).join('\n')}

Output Requirements:
1. Return ONLY a JSON array.
2. Each item must have: {"isValid": boolean, "reason": "string", "isFabricated": boolean}
3. Rules:
   - Starts with letter ${validations[0]?.letter}? (normalization: ا=أ=إ=آ)
   - Matches category ${validations[0]?.category}?
   - Is a real word (not gibberish)?

Example Output:
[{"isValid":true,"reason":"Valid","isFabricated":false}]
`;

        try {
            const startTime = Date.now();
            this.metrics.totalRequests++;

            const result = await this.model.generateContent(batchPrompt);
            const response = result.response;
            const text = response.text().trim();

            // Clean response from any non-JSON text
            const jsonStart = text.indexOf('[');
            const jsonEnd = text.lastIndexOf(']') + 1;
            let jsonText = text;

            if (jsonStart !== -1 && jsonEnd !== 0) {
                jsonText = text.substring(jsonStart, jsonEnd);
            } else {
                // Try finding any JSON-like structure
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                }
            }

            console.log(`[AI Batch] Response raw: ${text.substring(0, 200)}...`);
            console.log(`[AI Batch] JSON extracted: ${jsonText.substring(0, 200)}...`);

            try {
                const jsonArray = JSON.parse(jsonText);
                if (Array.isArray(jsonArray) && jsonArray.length === validations.length) {
                    this.metrics.successfulRequests++;
                    return jsonArray.map((item: any) => ({
                        isValid: Boolean(item.isValid),
                        reason: item.reason || (item.isValid ? "إجابة صحيحة" : "إجابة خاطئة"),
                        isFabricated: Boolean(item.isFabricated || false)
                    }));
                } else {
                    throw new Error(`Invalid array length: expected ${validations.length}, got ${jsonArray?.length}`);
                }
            } catch (e) {
                console.error("[AI] Failed to parse JSON, falling back to individual validation:", e);
                // Fallback to individual
                const individualResults = [];
                for (const validation of validations) {
                    try {
                        const result = await this.validateSingle(validation.category, validation.letter, validation.answer);
                        individualResults.push(result);
                    } catch (error) {
                        console.error("[AI] Individual validation failed:", error);
                        individualResults.push(null);
                    }
                }
                return individualResults;
            }

        } catch (error: any) {
            console.error("Batch validation failed:", error);
            this.metrics.failedRequests++;

            // Handle server errors better
            if (error.status === 503 || error.status === 429) {
                console.warn(`[AI] Server error ${error.status}, retrying with backoff`);
                this.metrics.rateLimitHits++;

                // One-time simple retry for batch
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    // Recursive retry logic is complex here, for now just fail gracefully to DB
                    // or we could allow the validateAllRoundAnswers loop to handle it if we throw?
                    // Better to return nulls and let HybridValidator fallback to DB
                    return validations.map(() => null);
                } catch (retryError) {
                    console.error("[AI] Retry also failed:", retryError);
                }
            }

            return validations.map(() => null);
        }
    }

    async validate(category: string, letter: string, answer: string): Promise<{ isValid: boolean; reason: string; isFabricated: boolean } | null> {
        if (!answer || !answer.trim()) return { isValid: false, reason: "إجابة فارغة", isFabricated: false };
        if (answer.trim().length < 2) return { isValid: false, reason: "إجابة قصيرة جداً", isFabricated: false };

        const normalizedAnswer = answer.trim().toLowerCase();
        const cacheKey = `${category}:${letter}:${normalizedAnswer}`;

        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        if (!this.model) {
            console.log("[AI Stub] No model loaded. Returning null.");
            return null;
        }

        this.metrics.cacheMisses++;
        return this.validateSingle(category, letter, answer);
    }

    private async validateSingle(category: string, letter: string, answer: string): Promise<{ isValid: boolean; reason: string; isFabricated: boolean } | null> {
        console.log(`[AI Validator] Checking: Letter=${letter}, Category=${category}, Word=${answer}`);

        try {
            const startTime = Date.now();
            this.metrics.totalRequests++;

            const prompt = this.generatePrompt(category, letter, answer);
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            let text = response.text();

            // Clean markdown
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            // Extract JSON object if surrounded by other text
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                text = text.substring(startIndex, endIndex + 1);
            }

            console.log(`[AI Response ${Date.now() - startTime}ms] ${text}`);

            let validationResult;
            try {
                const json = JSON.parse(text);
                validationResult = {
                    isValid: json.isValid,
                    reason: json.reason || (json.isValid ? "إجابة صحيحة" : "إجابة خاطئة"),
                    isFabricated: json.isFabricated || false
                };
            } catch (e) {
                console.error("Failed to parse AI JSON:", text);
                const lower = text.toLowerCase();
                const isValid = lower.includes("true");
                validationResult = {
                    isValid,
                    reason: isValid ? "تحكيم طوارئ (صح)" : "تحكيم طوارئ (غلط)",
                    isFabricated: false
                };
            }

            const cacheKey = `${category}:${letter}:${answer.trim().toLowerCase()}`;
            this.setCache(cacheKey, validationResult);

            this.metrics.successfulRequests++;
            return validationResult;

        } catch (error: any) {
            console.error("AI Validation Error:", error);
            this.metrics.failedRequests++;

            if (error.message?.includes("429") || error.status === 429) {
                console.warn("AI Quota Exceeded. Returning null to trigger fallback.");
                this.metrics.rateLimitHits++;
                return null;
            }

            return null;
        }
    }

    // Rate limiting helper - ensures minimum interval between API calls
    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    // Execute with exponential backoff retry
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelayMs: number = 2000
    ): Promise<T | null> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.waitForRateLimit();
                return await operation();
            } catch (error: any) {
                const isServerError = error.status === 503 || error.status === 429 ||
                    error.message?.includes("overloaded") ||
                    error.message?.includes("Service Unavailable");

                if (isServerError && attempt < maxRetries) {
                    const delay = baseDelayMs * Math.pow(2, attempt);
                    console.log(`[AI Retry] Server overloaded. Attempt ${attempt + 1}/${maxRetries}. Waiting ${delay}ms`);
                    this.metrics.rateLimitHits++;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else if (isServerError) {
                    console.error(`[AI Retry] Max retries (${maxRetries}) reached after server errors`);
                    this.metrics.rateLimitHits++;
                    return null;
                } else {
                    console.error(`[AI Error] Non-server error:`, error.message);
                    throw error;
                }
            }
        }
        return null;
    }

    // New method: Validate all round answers in a SINGLE API call
    async validateAllRoundAnswers(
        items: Array<{ playerId: string, category: string, letter: string, answer: string }>
    ): Promise<Map<string, { isValid: boolean; reason: string; isFabricated: boolean }>> {

        const results = new Map<string, { isValid: boolean; reason: string; isFabricated: boolean }>();
        const toValidate: Array<{ playerId: string, category: string, letter: string, answer: string, cacheKey: string }> = [];

        // Check cache first for all items
        for (const item of items) {
            const key = `${item.playerId}:${item.category}`;

            if (!item.answer || !item.answer.trim()) {
                results.set(key, { isValid: false, reason: "إجابة فارغة", isFabricated: false });
                continue;
            }

            if (item.answer.trim().length < 2) {
                results.set(key, { isValid: false, reason: "إجابة قصيرة جداً", isFabricated: false });
                continue;
            }

            const cacheKey = `${item.category}:${item.letter}:${item.answer.trim().toLowerCase()}`;
            const cached = this.getFromCache(cacheKey);

            if (cached) {
                results.set(key, cached);
            } else {
                toValidate.push({ ...item, cacheKey });
                this.metrics.cacheMisses++;
            }
        }

        // If all cached, return immediately
        if (toValidate.length === 0) {
            console.log(`[AI] All ${items.length} answers served from cache`);
            return results;
        }

        console.log(`[AI] Validating ${toValidate.length} answers in SINGLE request (${items.length - toValidate.length} from cache)`);

        // Create a single comprehensive prompt for ALL answers
        const batchPrompt = `
You are a strict JSON-only API. You must output VALID JSON and NOTHING ELSE.
Do not say "Here is the JSON" or "Welcome". Just the raw JSON array.

Task: Validate these answers for the game "Egyptian Bus Complete" (Scattergories).

Input:
${toValidate.map((v, i) => `Item ${i}: Letter='${v.letter}', Category='${v.category}', Answer='${v.answer}'`).join('\n')}

Rules:
1. Nonsense/Gibberish = { isValid: false, isFabricated: true }
2. Wrong First Letter = { isValid: false, reason: "Wrong letter" }
3. Wrong Category = { isValid: false, reason: "Wrong category" }
4. Valid = { isValid: true, reason: "Correct" }

Output format:
[
  { "isValid": boolean, "reason": "string", "isFabricated": boolean },
  ...
]
`;

        if (!this.model) {
            // No AI model, return valid (fail open) only if database didn't reject it elsewhere
            // But here we return "AI unavailable" so HybridValidator knows
            for (const item of toValidate) {
                results.set(`${item.playerId}:${item.category}`, {
                    isValid: true, // Emergency Fallback
                    reason: "AI غير متاح (Fallback)",
                    isFabricated: false
                });
            }
            return results;
        }

        try {
            const aiResults = await this.executeWithRetry(async () => {
                const startTime = Date.now();
                this.metrics.totalRequests++;

                const result = await this.model.generateContent(batchPrompt);
                const response = result.response;
                let text = response.text();
                console.log(`[AI Raw Response] ${text}`); // Debug log

                // Clean markdown
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();

                // Extract JSON array if surrounded by other text
                const startIndex = text.indexOf('[');
                const endIndex = text.lastIndexOf(']');
                if (startIndex !== -1 && endIndex !== -1) {
                    text = text.substring(startIndex, endIndex + 1);
                }

                let jsonArray;
                try {
                    jsonArray = JSON.parse(text);
                } catch (e) {
                    console.error("[AI Batch] JSON Parse Error. Raw text:", text);
                    throw new Error("Failed to parse JSON");
                }

                if (!Array.isArray(jsonArray) || jsonArray.length !== toValidate.length) {
                    throw new Error(`Invalid response length: expected ${toValidate.length}, got ${jsonArray?.length}`);
                }

                return jsonArray;
            });

            if (aiResults) {
                this.metrics.successfulRequests++;

                // Map results back to player:category keys
                for (let i = 0; i < toValidate.length; i++) {
                    const item = toValidate[i];
                    const aiResult = aiResults[i];
                    const key = `${item.playerId}:${item.category}`;

                    const validationResult = {
                        isValid: aiResult.isValid,
                        reason: aiResult.reason || (aiResult.isValid ? "إجابة صحيحة" : "إجابة خاطئة"),
                        isFabricated: aiResult.isFabricated || false
                    };

                    results.set(key, validationResult);
                    this.setCache(item.cacheKey, validationResult);
                }
            } else {
                // AI failed but retry exhausted - be LENIENT and ACCEPT all
                // This ensures game always progresses with fair validation
                console.warn(`[AI Fallback] AI unavailable for ${toValidate.length} answers - accepting all for database refinement`);
                for (const item of toValidate) {
                    results.set(`${item.playerId}:${item.category}`, {
                        isValid: true, // Accept everything - let database validation in gameManager refine
                        reason: "AI غير متاح حالياً",
                        isFabricated: false
                    });
                }
            }

        } catch (error: any) {
            console.error("[AI validateAllRoundAnswers] Error:", error);
            this.metrics.failedRequests++;

            // Fallback: ALWAYS ACCEPT - database validation in gameManager will refine
            console.warn(`[AI Fallback] Exception occurred - accepting all ${toValidate.length} answers for database validation`);
            for (const item of toValidate) {
                results.set(`${item.playerId}:${item.category}`, {
                    isValid: true, // Accept all - system validation will refine
                    reason: "خطأ تقني - تم القبول مبدئياً",
                    isFabricated: false
                });
            }
        }

        return results;
    }

    async generateWildcardAnswers(
        categories: string[],
        letter: string
    ): Promise<Record<string, string> | null> {
        if (!this.model) {
            console.log("[AI Wildcard] No model loaded. Returning null.");
            return null;
        }

        // Check cache first - wildcard answers are consistent for same letter+categories combo
        const cacheKey = `wildcard:${letter}:${categories.sort().join(',')}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`[AI Wildcard Cache] Hit for ${letter} - ${categories.join(', ')}`);
            // Parse cached format back to object
            try {
                return JSON.parse(cached.reason); // reason field contains the JSON stringified answers
            } catch (e) {
                return null;
            }
        }

        console.log(`[AI Wildcard] Generating answers for letter='${letter}', categories=[${categories.join(', ')}]`);

        try {
            const startTime = Date.now();
            this.metrics.totalRequests++;

            const prompt = `
أنت خبير في لعبة "باص كامل" (نسخة عربية من Scattergories).

**المهمة:** إنشاء إجابات صحيحة وحقيقية ومشهورة للفئات التالية:

**الحرف المطلوب:** '${letter}'
**الفئات:** ${categories.join(', ')}

**قواعد صارمة - اقرأ بعناية:**
1. كل كلمة يجب أن تبدأ بالحرف '${letter}'
2. السماح بالتبديلات العربية: (ا، أ، إ، آ) = نفس الحرف
3. **كل كلمة يجب أن تكون حقيقية 100% ومشهورة - لا تخترع كلمات**
4. استخدم كلمات شائعة ومعروفة فقط
5. تجنب الكلمات النادرة أو الغريبة جداً
6. **إذا لم تجد كلمة حقيقية لفئة معينة، استخدم كلمة من فئة قريبة**

**أمثلة صحيحة للحرف "ث":**
- ولد (اسم ذكر): ثامر، ثائر
- بنت (اسم بنت): ثريا، ثناء
- بلد (دولة): ثمود (قبيلة تاريخية) - استخدم بدائل حقيقية
- حيوان: ثعلب، ثعبان
- جماد (شيء): ثلاجة، ثوب

**أمثلة خاطئة (ممنوعة):**
- ثول ❌ (كلمة مختلقة)
- ثيران ❌ (لا تبدأ بـ ث)

**الإخراج (JSON فقط):**
{
  "${categories[0]}": "إجابة حقيقية",
  "${categories[1]}": "إجابة حقيقية",
  ...
}
`;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().replace(/\`\`\`json|\`\`\`/g, '').trim();

            console.log(`[AI Wildcard Response ${Date.now() - startTime}ms] ${text.substring(0, 100)}...`);

            try {
                const answers: Record<string, string> = JSON.parse(text);

                // Validate structure
                const isValid = categories.every(cat => answers[cat] && typeof answers[cat] === 'string');
                if (!isValid) {
                    console.error("[AI Wildcard] Response missing categories or invalid format");
                    return null;
                }

                // Cache the result (store answers as JSON in reason field)
                this.setCache(cacheKey, {
                    isValid: true,
                    reason: JSON.stringify(answers),
                    isFabricated: false
                });

                this.metrics.successfulRequests++;
                return answers;

            } catch (e) {
                console.error("[AI Wildcard] Failed to parse JSON response:", text);
                return null;
            }

        } catch (error: any) {
            console.error("[AI Wildcard Generation Error]:", error);
            this.metrics.failedRequests++;

            if (error.message?.includes("429") || error.status === 429) {
                console.warn("[AI Wildcard] Rate limit hit");
                this.metrics.rateLimitHits++;
            }

            return null;
        }
    }

    getMetrics() {
        const uptime = Date.now() - this.metrics.startTime;
        const totalCacheAccess = this.metrics.cacheHits + this.metrics.cacheMisses;

        return {
            ...this.metrics,
            uptimeHours: (uptime / 1000 / 60 / 60).toFixed(2),
            successRate: this.metrics.totalRequests > 0 ?
                ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%' : '0%',
            cacheHitRate: totalCacheAccess > 0 ?
                ((this.metrics.cacheHits / totalCacheAccess) * 100).toFixed(2) + '%' : '0%',
            cacheSize: this.cache.size
        };
    }

    clearCache(): void {
        this.cache.clear();
        console.log("[AI Cache] Cleared. Previous size:", this.cache.size);
    }

    resetMetrics(): void {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            rateLimitHits: 0,
            startTime: Date.now()
        };
        console.log("[AI Metrics] Reset");
    }
}
