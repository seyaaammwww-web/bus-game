
import WebSocket from "ws";
import { strict as assert } from "assert";
import type { WSMessage } from "../shared/schema.ts";

// Config
const WS_URL = "ws://localhost:5001/ws";

// Helpers
function createClient(name: string): Promise<WebSocket> {
    return new Promise((resolve) => {
        const ws = new WebSocket(WS_URL);
        ws.on("open", () => resolve(ws));
    });
}

function waitForMessage(ws: WebSocket, type: string, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.removeListener("message", handler);
            reject(new Error(`Timeout waiting for ${type}`));
        }, timeoutMs);

        const handler = (data: Buffer) => {
            try {
                const msg = JSON.parse(data.toString()) as WSMessage;
                // console.log(`Received: ${msg.type}`); // Debug logging
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
    ws.send(JSON.stringify({ type, payload }));
}

async function runTest() {
    console.log("Starting Verification Test...");

    const hostWs = await createClient("Host");
    console.log("Host connected");

    const playerWs = await createClient("Player1");
    console.log("Player1 connected");

    // 1. Create Room
    send(hostWs, "create_room", { playerName: "Host" });
    const createdPayload = await waitForMessage(hostWs, "room_created");
    const roomCode = createdPayload.room.code;
    const hostId = createdPayload.playerId;
    console.log(`Room created: ${roomCode}, HostId: ${hostId}`);

    // 2. Join Room
    send(playerWs, "join_room", { roomCode, playerName: "Player1" });
    const joinedPayload = await waitForMessage(playerWs, "room_joined");
    const playerId = joinedPayload.playerId;
    console.log(`Player1 joined: ${playerId}`);

    // Wait for Host to see Player1
    await waitForMessage(hostWs, "player_joined");

    // 3. Set Ready
    send(hostWs, "player_ready", { playerId: hostId });
    send(playerWs, "player_ready", { playerId });
    await waitForMessage(hostWs, "player_ready"); // Wait for both? Use waitForMessage logic carefully

    // 4. Start Game
    console.log("Starting Game...");
    send(hostWs, "start_game", {});
    const startPayload = await waitForMessage(hostWs, "round_start");
    console.log(`Round started: Letter ${startPayload.room.rounds[0].letter}`);

    // 5. Submit Answers
    // We need to submit answers for both? Or just Player1 if host is referee?
    // Let's make Host the Referee first. Actually better to do that in Lobby.
    // But we are already playing. Let's make Host set himself as Referee? 
    // Or restart? Let's process round, then Host becomes Referee in results phase? No.
    // Referee must be set BEFORE round finishes ideally, or during playing.
    // Let's set referee now.
    send(hostWs, "set_referee", { playerId: hostId });
    const syncPayload = await waitForMessage(hostWs, "sync_state");
    assert(syncPayload.room.refereeId === hostId, "Host failed to become Referee");
    console.log("Host is Referee.");

    // Submit Answers for Player1
    console.log("Submitting Player1 answers...");
    send(playerWs, "submit_answers", { answers: { "ولد": "Ahmad", "بنت": "Amira" } }); // Simplified categories
    // Host submits too? Referee doesn't play usually but can submit empty.
    // If referee set, host might not need to submit? Let's submit empty for host just in case.
    // send(hostWs, "submit_answers", { answers: {} });

    // Wait for round results/referee review
    // Need everyone to submit.
    // How many players? 2. Host and Player1.
    // If host is referee, he doesn't submit? Let's check logic.
    // Logic: `activePlayers = draft.refereeId ? draft.players.filter(p => p.id !== draft.refereeId && p.id !== round.banishedPlayerId).length`
    // So only Player1 needs to submit.

    // Player1 submitted, so round should end or process.
    // Wait for 'round_results' or 'referee_review_start' (which sends sync_state?)
    // Actually `finishRoundPhase` sets phase to `referee_review` and broadcasts `round_results`.
    const reviewPayload = await waitForMessage(hostWs, "round_results");
    console.log("Round finished. Phase:", reviewPayload.room.phase);
    assert(reviewPayload.room.phase === 'referee_review', "Phase should be referee_review");

    // 6. Test Referee Toggle Validity
    console.log("Testing Referee Toggle...");
    // Find an answer to toggle. Player1's 'ولد'.
    // Currently validatedAnswers should have it.
    const round = reviewPayload.room.rounds[0];
    const answer = round.validatedAnswers.find((a: any) => a.playerId === playerId && a.category === 'ولد');
    assert(answer, "Answer not found");
    const initialValidity = answer.isValid;
    console.log(`Initial Validity for 'ولد': ${initialValidity}`);

    // Toggle it
    send(hostWs, "referee_toggle_validity", { playerId, category: "ولد" });

    const togglePayload = await waitForMessage(hostWs, "sync_state");
    const updatedRound = togglePayload.room.rounds[0];
    const updatedAnswer = updatedRound.validatedAnswers.find((a: any) => a.playerId === playerId && a.category === 'ولد');

    console.log(`New Validity for 'ولد': ${updatedAnswer.isValid}`);
    assert(updatedAnswer.isValid !== initialValidity, "Validity did not toggle!");

    // Toggle Back
    send(hostWs, "referee_toggle_validity", { playerId, category: "ولد" });
    await waitForMessage(hostWs, "sync_state");
    console.log("Toggled back successfully.");

    // 7. Enable Voting Test
    console.log("Testing Voting System...");
    // Host removes referee to enable voting
    send(hostWs, "remove_referee", {});
    await waitForMessage(hostWs, "sync_state");

    // Host enables voting setting
    send(hostWs, "update_settings", { enableVoting: true });
    await waitForMessage(hostWs, "sync_state");

    // Request a Vote
    console.log("Requesting Vote...");
    send(playerWs, "request_vote", { category: "بنت", word: "Amira" });

    // Should transition to 'voting' phase and broadcast sync_state
    const votingPayload = await waitForMessage(hostWs, "sync_state");
    assert(votingPayload.room.phase === 'voting', "Phase should be voting");
    assert(votingPayload.room.currentVote, "Current vote should exist");
    console.log("Vote started. Waiting 5s for timer check (manual check or subsequent message)...");

    // Simulate Voting
    send(hostWs, "vote_cast", { vote: "no" }); // Host votes No
    // Player cannot vote on own?
    // Let's see if we get update.
    const voteUpdate = await waitForMessage(hostWs, "sync_state");
    assert(voteUpdate.room.currentVote.votes.no === 1, "Vote count should update");
    console.log("Vote cast registered.");

    console.log("Test Completed Successfully!");
    process.exit(0);
}

runTest().catch(e => {
    console.error("Test Failed:", e);
    process.exit(1);
});
