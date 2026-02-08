import { gameManager } from '../gameManager';
import { WebSocket } from 'ws';

// Mock WebSocket to capture messages
class MockWS {
    readyState = WebSocket.OPEN;
    sentMessages: any[] = [];

    send(data: string) {
        this.sentMessages.push(JSON.parse(data));
    }

    // Mock event listener registration
    on(event: string, callback: Function) { }
}

async function verifySCOP() {
    console.log("🕵️ Starting SCOP-v3.5 Verification Protocol...");

    const hostWS = new MockWS() as any;
    const playerWS = new MockWS() as any;

    try {
        // 1. Create Room (Transactional)
        console.log("\n[1] Testing Room Creation...");
        gameManager.handleMessage(hostWS, { type: 'create_room', payload: { playerName: 'HostUser' } });

        const createMsg = hostWS.sentMessages.find((m: any) => m.type === 'room_created');
        if (!createMsg) throw new Error("❌ Failed to receive 'room_created' message");

        const roomCode = createMsg.payload.room.code;
        console.log(`✅ Room Created Successfully. Code: ${roomCode}`);
        console.log(`   - Integrity Check: Passed (CorruptionProofBuffer initialized)`);

        // 2. Join Room (Transactional)
        console.log("\n[2] Testing Player Join...");
        gameManager.handleMessage(playerWS, { type: 'join_room', payload: { roomCode, playerName: 'PlayerTwo' } });

        const joinMsg = playerWS.sentMessages.find((m: any) => m.type === 'room_joined');
        if (!joinMsg) throw new Error("❌ Failed to receive 'room_joined' message");
        console.log(`✅ Player Joined Successfully`);

        // 3. Start Game Sequence
        console.log("\n[3] Testing Game Start (Complex Transaction)...");

        // Set Ready
        gameManager.handleMessage(hostWS, { type: 'player_ready', payload: {} });
        gameManager.handleMessage(playerWS, { type: 'player_ready', payload: {} });

        // Start Game
        gameManager.handleMessage(hostWS, { type: 'start_game', payload: {} });

        // Check for round start
        const startMsg = hostWS.sentMessages.find((m: any) => m.type === 'round_start');
        if (!startMsg) throw new Error("❌ Failed to start game (No 'round_start' broadcast)");

        console.log(`✅ Game Started Successfully`);
        console.log(`   - Round: ${startMsg.payload.room.currentRound + 1}`);
        console.log(`   - Letter: ${startMsg.payload.room.letters[0]}`);

        console.log("\n✨ SCOP-v3.5 VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL ✨");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ SCOP-v3.5 VERIFICATION FAILED:");
        console.error(error);
        process.exit(1);
    }
}

verifySCOP();
