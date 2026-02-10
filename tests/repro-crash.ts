
import WebSocket from "ws";
import { strict as assert } from "assert";
import type { WSMessage } from "../shared/schema.ts";

// Config
const WS_URL = "ws://localhost:5001/ws";

// Helpers
function createClient(name: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.on("open", () => resolve(ws));
        ws.on("error", reject);
        ws.on("close", (code, reason) => console.log(`[${name}] Disconnected: ${code} ${reason}`));
    });
}

function waitForMessage(ws: WebSocket, type: string, timeoutMs = 15000): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.removeListener("message", handler);
            reject(new Error(`Timeout waiting for ${type}`));
        }, timeoutMs);

        const handler = (data: Buffer) => {
            try {
                const msg = JSON.parse(data.toString()) as WSMessage;
                if (msg.type === type) {
                    clearTimeout(timer);
                    ws.removeListener("message", handler);
                    resolve(msg.payload);
                }
            } catch (e) {
                // ignore
            }
        };
        ws.on("message", handler);
    });
}

function send(ws: WebSocket, type: string, payload: any) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    }
}

async function runTest() {
    console.log("Starting Crash Reproduction Test (Referee set in Lobby)...");

    const hostWs = await createClient("Host");
    const playerWs = await createClient("Player1");
    // const player2Ws = await createClient("Player2");

    // 1. Create Room
    send(hostWs, "create_room", { playerName: "Host" });
    const createdPayload = await waitForMessage(hostWs, "room_created");
    const roomCode = createdPayload.room.code;
    const hostId = createdPayload.playerId;
    console.log(`Room created: ${roomCode}`);

    // 2. Join Room
    send(playerWs, "join_room", { roomCode, playerName: "Player1" });
    const joinedPayload = await waitForMessage(playerWs, "room_joined");
    const playerId = joinedPayload.playerId;
    await waitForMessage(hostWs, "player_joined"); // Ensure host knows

    // 3. Set Referee in Lobby
    console.log("Setting Referee in Lobby...");
    send(hostWs, "set_referee", { playerId: hostId });
    const syncLobby = await waitForMessage(hostWs, "sync_state");
    assert(syncLobby.room.refereeId === hostId, "Referee should be set");
    console.log("Referee set to Host.");

    // 4. Start Game (Round 1)
    send(hostWs, "player_ready", { playerId: hostId });
    send(playerWs, "player_ready", { playerId });

    await waitForMessage(hostWs, "player_ready");
    // Wait for player ready sync? Actually `player_ready` message is broadcasted.
    // Let's just wait for start confirmation.

    console.log("Starting Round 1...");
    send(hostWs, "start_game", {});
    const r1Start = await waitForMessage(hostWs, "round_start");
    console.log(`Round 1 Started: ${r1Start.room.rounds[0].letter}`);

    // 5. Submit Answers (Player1 only, Host is referee)
    console.log("Submitting answers (Player1)...");
    send(playerWs, "submit_answers", { answers: { "ولد": "Ahmad" } });

    // Referee doesn't submit.
    // Round should finish? 
    // "activePlayers" filter excludes referee.
    // So 1 active player. 1 submission. Should finish.

    const r1Results = await waitForMessage(hostWs, "round_results");
    console.log("Round 1 Finished. Phase:", r1Results.room.phase);

    // Phase should be 'referee_review' because referee exists!
    assert(r1Results.room.phase === 'referee_review', "Should be in referee_review");

    // 6. Referee Approves
    console.log("Referee Approving...");
    send(hostWs, "referee_approve", {});

    // Should transition to 'results'. `finishRoundPhase` broadcasts 'round_results'.
    // We might also get 'sync_state' if logic changes, but let's wait for any state update.
    const approvalResult = await waitForMessage(hostWs, "round_results", 5000)
        .catch(() => waitForMessage(hostWs, "sync_state", 5000));

    console.log("Round 1 Approved. Phase:", approvalResult.room.phase);
    assert(approvalResult.room.phase === 'results', "Should be in results phase");

    // 7. Next Round
    console.log("Moving to Round 2...");
    send(hostWs, "next_round", {});
    const r2Start = await waitForMessage(hostWs, "round_start");
    console.log(`Round 2 Started: ${r2Start.room.rounds[1].letter}`);

    console.log("Test Completed without Crash");
    process.exit(0);
}

runTest().catch(e => {
    console.error("Test Failed:", e);
    process.exit(1);
});
