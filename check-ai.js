// check-ai.js
import dotenv from 'dotenv';
dotenv.config();

console.log("=== AI CONFIGURATION CHECK ===");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✓ SET" : "✗ MISSING");
console.log("GEMINIAPIKEY:", process.env.GEMINIAPIKEY ? "✓ SET" : "✗ MISSING");
console.log("GEMINI_MODEL_NAME:", process.env.GEMINI_MODEL_NAME || "gemini-3-flash-preview (default)");
console.log("GEMINIMODEL:", process.env.GEMINIMODEL || "gemini-3-flash-preview (default)");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");
console.log("=== END CHECK ===");
