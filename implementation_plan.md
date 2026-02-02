# Scalability Optimization Plan

## Goal
Optimize the Egyptian Bus game backend to support as many concurrent users as possible on a single Hugging Face Free Tier instance (target: ~500-800 stable users), preventing the crashes predicted for 5,000 users.

## User Review Required
> [!IMPORTANT]
> **Removing "Fuzzy Matching"**: I will be removing the "typo tolerance" (Levenshtein distance) feature. This is the #1 cause of CPU lag. Players will need to type words accurately (e.g., "أحمد" or "احمد" is fine due to normalization, but "ahmed" or "axmed" will be rejected).
>
> **Player Limits**: I will set a hard cap of **800 concurrent players** (approx 100 rooms). Attempts to join after this will receive a "Server Full" message. This protects the active players from lag.

## Proposed Changes

### 1. `server/services/wildcardService.ts` [CRITICAL]
- **Add Caching**: Implement a `Map<string, boolean>` to store results of `validateWord`.
    - Key: `${letter}:${category}:${normalized_word}`
    - Value: `true`/`false`
    - This turns O(N) database lookups into O(1) cache lookups for repeated words (very common in this game).
- **Remove Levenshtein**: Delete the matrix calculation code and the fuzzy logic.
- **Optimization**: Verify `normalizeArabic` is efficient.

### 2. `server/gameManager.ts` [SAFETY]
- **Add Global Limits**:
    - `MAX_TOTAL_PLAYERS = 800`
    - `MAX_ROOMS = 100`
- **Enforce Limits**:
    - Check `this.players.size` in `createRoom`, `joinRoom`, and `joinPublicRoom`.
    - Return specific error message: "سيرفر اللعبة ممتلئ حالياً (800/800). حاول مرة أخرى لاحقاً."

## Verification Plan
### Automated Tests
- Run a script to validate 1,000 words in a loop and measure time.
- Verify that cache is being hit (logging).

### Manual Verification
- Join game, ensure valid words are still accepted.
- Ensure slightly misspelled words are now rejected (as expected).
- Test "Server Full" message (by temporarily lowering limit to 1).
