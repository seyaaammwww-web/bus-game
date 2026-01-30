import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Configuration for Llama 3.3 70b
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL_NAME = "llama-3.3-70b-versatile";

interface AppealRequest {
    id: string; // Unique ID for tracking (e.g. playerId:category:word)
    playerId: string;
    category: string;
    letter: string;
    word: string;
    callback: (result: ValidationResult) => void;
}

interface ValidationResult {
    isValid: boolean;
    reason: string;
    isFabricated: boolean;
}

export class GroqService {
    private static instance: GroqService;
    private client: Groq;

    // Rate Limiting (Token Bucket similar logic)
    // Limit: 30 Requests Per Minute (RPM) -> 1 request every 2 seconds
    private lastRequestTime = 0;
    private minIntervalMs = 2500; // Safe buffer (2.5s) to stay under 30 RPM

    // Batching
    private queue: AppealRequest[] = [];
    private batchTimeout: NodeJS.Timeout | null = null;
    private MAX_BATCH_SIZE = 20; // Max items per single AI prompt
    private BATCH_WAIT_MS = 3000; // Wait 3s to aggregate appeals from different players

    private constructor() {
        if (!GROQ_API_KEY) {
            console.warn("⚠️ GROQ_API_KEY is missing! AI Service will fallback to auto-accept.");
        }
        this.client = new Groq({ apiKey: GROQ_API_KEY || "dummy_key" });
    }

    public static getInstance(): GroqService {
        if (!GroqService.instance) {
            GroqService.instance = new GroqService();
        }
        return GroqService.instance;
    }

    public get rawClient(): Groq {
        return this.client;
    }

    /**
     * Enqueue a request for validation.
     * Returns a promise that resolves when the batch is processed.
     */
    public enqueueAppeal(
        playerId: string,
        category: string,
        letter: string,
        word: string
    ): Promise<ValidationResult> {
        const id = `${playerId}:${category}`;

        // 1. Deduplication Check
        // If this exact appeal is already in the queue, return the existing promise's resolution
        // We can't easily return the *exact* same promise object unless we store it, 
        // but we can prevent adding a duplicate task.
        const existing = this.queue.find(q => q.id === id);
        if (existing) {
            console.log(`[GroqService] Duplicate appeal blocked for ${id}`);
            // Return a new promise that hooks into the existing callback
            return new Promise((resolve) => {
                const originalCallback = existing.callback;
                existing.callback = (result) => {
                    originalCallback(result);
                    resolve(result);
                };
            });
        }

        return new Promise((resolve) => {
            this.queue.push({
                id,
                playerId,
                category,
                letter,
                word,
                callback: resolve
            });

            console.log(`[GroqService] Enqueued appeal for "${word}". Queue size: ${this.queue.length}`);

            // Start batch timer if not running
            if (!this.batchTimeout) {
                this.batchTimeout = setTimeout(() => this.processBatch(), this.BATCH_WAIT_MS);
            }

            // If queue is huge, process immediately
            if (this.queue.length >= this.MAX_BATCH_SIZE) {
                if (this.batchTimeout) clearTimeout(this.batchTimeout);
                this.processBatch();
            }
        });
    }

    private async processBatch() {
        this.batchTimeout = null;
        if (this.queue.length === 0) return;

        // 1. Snapshot queue
        const currentBatch = [...this.queue];
        this.queue = []; // Clear main queue

        console.log(`[GroqService] Processing batch of ${currentBatch.length} items...`);

        // 2. Rate Limit Wait
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        if (timeSinceLast < this.minIntervalMs) {
            const wait = this.minIntervalMs - timeSinceLast;
            console.log(`[GroqService] Rate limit active. Waiting ${wait}ms...`);
            await new Promise(r => setTimeout(r, wait));
        }
        this.lastRequestTime = Date.now();

        // 3. Prepare Prompt
        if (!GROQ_API_KEY) {
            // Fallback Mode
            this.completeBatch(currentBatch, currentBatch.map(() => ({ isValid: true, reason: "AI Service Unavailable (Auto-Pass)", isFabricated: false })));
            return;
        }

        try {
            const prompt = this.generateBatchPrompt(currentBatch);

            const completion = await this.client.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: MODEL_NAME,
                temperature: 0.1, // Low creativity, high accuracy
                response_format: { type: "json_object" }, // Enforce JSON
            });

            const responseContent = completion.choices[0]?.message?.content;
            if (!responseContent) throw new Error("Empty response from Groq");

            const parsed = JSON.parse(responseContent);
            const resultsArray = parsed.results || [];

            // Map results back to requests
            // We rely on index preservation or ID matching. 
            // Let's assume the AI respects the array order requested.

            const mappedResults: ValidationResult[] = currentBatch.map((req, index) => {
                const aiRes = resultsArray[index];
                // Defensive check
                if (!aiRes) return { isValid: true, reason: "AI processing error", isFabricated: false }; // Fail open

                return {
                    isValid: !!aiRes.isValid,
                    reason: aiRes.reason || (aiRes.isValid ? "صحيح" : "غير صحيح"),
                    isFabricated: !!aiRes.isFabricated
                };
            });

            this.completeBatch(currentBatch, mappedResults);

        } catch (error) {
            console.error("[GroqService] API Error:", error);
            // Fallback: Accept only words > 2 chars, or just accept all to be "fun/forgiving"
            const fallbackResults = currentBatch.map(req => ({
                isValid: req.word.length > 1,
                reason: "السيستم مهنج بس حسبتهالك.. حظك حلو",
                isFabricated: false
            }));
            this.completeBatch(currentBatch, fallbackResults);
        }
    }

    private completeBatch(requests: AppealRequest[], results: ValidationResult[]) {
        requests.forEach((req, i) => {
            const result = results[i] || { isValid: true, reason: "Fallback", isFabricated: false };
            req.callback(result);
        });
    }

    private generateBatchPrompt(requests: AppealRequest[]): string {
        return `
    Act as a chill Egyptian judge for the game "Scattergories" (Autobis Complete).
    
    Task: Validate these ${requests.length} answers.
    
    Input Data:
    ${requests.map((r, i) => `Item ${i}: Letter="${r.letter}", Category="${r.category}", Word="${r.word}"`).join('\n')}

    Rules:
    1. **Normalization:** "أ", "إ", "آ" treated as same letter "ا".
    2. **Lenient:** Accept colloquial (Slang), formal (Fusha), or common spellings.
    3. **Fabrication:** Only reject if the word is clearly nonsense/made-up.
    4. **Tone:** Use simple Egyptian slang (Masri Aammi) for reasons. Be funny but brief. 
       Example: "مش ماشية بس هنعديها", "أيوه كده صح", "دي تأليف يا باشا"

    Output JSON Format (Strict):
    {
      "results": [
        { "isValid": boolean, "reason": "Simple Egyptian slang phrase", "isFabricated": boolean },
        ...
      ]
    }
    `;
    }

    // --- Helpers for Legacy / Metrics Support ---

    public getStats() {
        return {
            cacheSize: 0, // Cache handled by HybridValidator mostly
            queueSize: this.queue.length,
            lastRequestTime: new Date(this.lastRequestTime).toISOString()
        };
    }

    // Helper for single validation (non-batched view, but uses batch internally)
    public async validateWord(letter: string, category: string, word: string): Promise<ValidationResult> {
        return this.enqueueAppeal("sys-check-" + Date.now(), category, letter, word);
    }

    // Helper for batch validation array (maps to enqueue)
    public async validateBatch(items: Array<{ letter: string, category: string, word: string }>): Promise<ValidationResult[]> {
        const promises = items.map(item =>
            this.enqueueAppeal("sys-batch-" + Math.random(), item.category, item.letter, item.word)
        );
        return Promise.all(promises);
    }
}
