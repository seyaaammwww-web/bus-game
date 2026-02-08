
import { GameManager } from '../gameManager.ts';
import { CausalityGuard } from '../utils/CausalityGuard.ts';
import { GameRoom } from '../../shared/schema.ts';

// Mock Websocket
const mockWs = {
    send: (msg: string) => { },
    readyState: 1
} as any;

async function testCausality() {
    console.log("🟦 [TEST] Starting Causality Protocol Test...");
    const gm = GameManager.getInstance();
    const guard = CausalityGuard.getInstance();

    // 1. Create Room (Implicitly handled, we'll mimic the flow)
    console.log("   --> Creating Room...");
    const room = gm.createRoom(mockWs, "HostPlayer");
    const roomCode = room.payload.roomCode;

    // Hack to get the room object cleanly (since createRoom returns message)
    // In a real test we'd access private maps or use public APIs.
    // We'll trust the GM internal logs for now, or we can peek if we export `rooms` for testing.
    // For this script, we'll assume the room exists and we can access it via a new connection joining.

    console.log(`   --> Room ${roomCode} created.`);

    // 2. Join Player - Should trigger CAUSAL LOG
    console.log("   --> Joining Player 2...");
    gm.handleMessage(mockWs, { type: 'join_room', payload: { roomCode, playerName: 'Player2' } });

    // 3. Start Game - Should trigger CAUSAL LOG
    console.log("   --> Starting Game...");
    gm.handleMessage(mockWs, { type: 'start_game', payload: {} });

    // 4. Manual Verification of Log
    // We need to inspect the log. Since log is private in guard, we might need a public accessor for testing.
    // Wait, I added getLog()!
    const log = guard.getLog(roomCode);

    if (log.length === 0) {
        console.error("🔴 [FAIL] No causality log entries found!");
    } else {
        console.log(`🟢 [PASS] Log contains ${log.length} entries.`);
        log.forEach((entry, i) => {
            console.log(`      [${i}] ${entry.eventType} | Hash: ${entry.newStateHash.substring(0, 8)}`);
            if (i > 0) {
                const prev = log[i - 1];
                if (entry.prevStateHash !== prev.newStateHash) {
                    console.error(`🔴 [FAIL] Chain Broken at index ${i}! ${entry.prevStateHash} != ${prev.newStateHash}`);
                }
            }
        });
    }
}

testCausality().catch(console.error);
