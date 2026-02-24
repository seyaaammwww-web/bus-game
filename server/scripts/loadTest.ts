import WebSocket from 'ws';
import os from 'os';

const SERVER_URL = process.env.WS_URL || 'ws://localhost:5001/ws';
const NUM_PLAYERS = parseInt(process.env.NUM_PLAYERS || '20');
const DRAFT_SPAM_INTERVAL = parseInt(process.env.DRAFT_SPAM_INTERVAL || '200'); // ms
const ROUND_DURATION = parseInt(process.env.ROUND_DURATION || '10000'); // ms

interface Metrics {
    latencies: number[];
    messagesSent: number;
    messagesReceived: number;
    errors: number;
}

const metrics: Metrics = {
    latencies: [],
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
};

let roomCode = '';
let clients: BotClient[] = [];

class BotClient {
    ws: WebSocket;
    id: number;
    playerId: string;
    isHost: boolean;
    pingInterval: NodeJS.Timeout | null = null;
    draftInterval: NodeJS.Timeout | null = null;
    lastPingSentTime: number = 0;

    constructor(id: number, isHost: boolean = false) {
        this.id = id;
        this.isHost = isHost;
        this.playerId = `bot_${id}_${Date.now()}`;
        this.ws = new WebSocket(SERVER_URL);

        this.ws.on('open', this.onOpen.bind(this));
        this.ws.on('message', this.onMessage.bind(this));
        this.ws.on('error', this.onError.bind(this));
        this.ws.on('close', this.onClose.bind(this));
    }

    send(type: string, payload?: any) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
            metrics.messagesSent++;
        }
    }

    onOpen() {
        if (this.isHost) {
            this.send('create_room', { playerName: `HostBot_0` });
        } else {
            // Wait for host to create room
            const checkRoom = setInterval(() => {
                if (roomCode) {
                    clearInterval(checkRoom);
                    this.send('join_room', { roomCode, playerName: `Bot_${this.id}` });
                }
            }, 100);
        }

        // Heartbeat
        this.pingInterval = setInterval(() => {
            this.lastPingSentTime = Date.now();
            this.send('ping');
        }, 5000);
    }

    onMessage(data: WebSocket.Data) {
        metrics.messagesReceived++;
        try {
            const msg = JSON.parse(data.toString());

            if (msg.type === 'error') {
                console.error(`[Bot_${this.id}] Server Error:`, msg.payload);
            }

            if (msg.type === 'pong') {
                const latency = Date.now() - this.lastPingSentTime;
                // Add first 1000 latencies or randomly sample to avoid array blowup
                if (metrics.latencies.length < 5000) {
                    metrics.latencies.push(latency);
                }
            }

            if (msg.type === 'room_created' && this.isHost) {
                roomCode = msg.payload.room.code;
                console.log(`[Host] Created room: ${roomCode}. Waiting for ${NUM_PLAYERS - 1} bots to join...`);
            }

            if (msg.type === 'room_joined' && !this.isHost) {
                // If this is the last bot, the host can start the game
                if (this.id === NUM_PLAYERS - 1) {
                    console.log(`[Bot_${this.id}] Joined. All bots are in. Host is starting the game...`);
                    clients[0].send('start_game');
                }
            }

            if (msg.type === 'round_start') {
                if (this.id === 0) console.log(`[Round Started] Bots will now spam draft_update for ${ROUND_DURATION / 1000} seconds...`);
                this.startDraftSpamming();

                // Submit answers after duration
                setTimeout(() => {
                    this.stopDraftSpamming();
                    if (this.id === 0) console.log(`[Bot_${this.id}] Time is up. Submitting answers.`);
                    this.send('submit_answers', {
                        answers: {
                            'ولد': `ولد${this.id}`,
                            'بنت': `بنت${this.id}`,
                            'جماد': `جماد${this.id}`,
                            'حيوان': `حيوان${this.id}`,
                            'بلد': `بلد${this.id}`
                        }
                    });
                }, ROUND_DURATION);
            }

            // Automatic Voting (if it goes to voting)
            if (msg.type === 'voting_start') {
                if (this.id === 0) console.log(`[Voting Started] Bots are voting randomly...`);
                const items = msg.payload.voteQueue || [];
                // Simple random voting
                items.forEach((item: any) => {
                    if (item.requesterId !== this.playerId) {
                        this.send('cast_parallel_vote', {
                            requestId: item.requestId,
                            category: item.category,
                            vote: Math.random() > 0.5 ? 'yes' : 'no'
                        });
                    }
                });
            }

        } catch (err) {
            metrics.errors++;
        }
    }

    startDraftSpamming() {
        this.draftInterval = setInterval(() => {
            this.send('draft_update', {
                category: 'ولد',
                value: `draft_${Date.now()}`
            });
        }, DRAFT_SPAM_INTERVAL);
    }

    stopDraftSpamming() {
        if (this.draftInterval) clearInterval(this.draftInterval);
    }

    onError(err: any) {
        metrics.errors++;
        console.error(`[Bot_${this.id}] Error:`, err.message);
    }

    onClose() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.stopDraftSpamming();
    }
}

// -----------------------------------------------------
// Metrics Collector
// -----------------------------------------------------
function printMetrics() {
    const mem = process.memoryUsage();

    // Sort latencies array
    const sorted = [...metrics.latencies].sort((a, b) => a - b);
    const minLat = sorted[0] || 0;
    const maxLat = sorted[sorted.length - 1] || 0;
    const avgLat = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;

    // P95 latency
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95Lat = sorted[p95Idx] || 0;

    console.log('\n=============================================');
    console.log(`📊 LIVE METRICS (Running with ${NUM_PLAYERS} Bots)`);
    console.log('=============================================');
    console.log(`Messages Sent (Total):     ${metrics.messagesSent}`);
    console.log(`Messages Recv (Total):     ${metrics.messagesReceived}`);
    console.log(`Errors Encountered:        ${metrics.errors}`);
    console.log(`---------------------------------------------`);
    console.log(`Latency (Min):             ${minLat} ms`);
    console.log(`Latency (Max):             ${maxLat} ms`);
    console.log(`Latency (Avg):             ${avgLat} ms`);
    console.log(`Latency (P95):             ${p95Lat} ms`);
    console.log(`---------------------------------------------`);
    console.log(`Memory RSS:                ${Math.round(mem.rss / 1024 / 1024)} MB`);
    console.log(`Memory Heap Total:         ${Math.round(mem.heapTotal / 1024 / 1024)} MB`);
    console.log(`Memory Heap Used:          ${Math.round(mem.heapUsed / 1024 / 1024)} MB`);
    console.log('=============================================\n');
}

async function runLoadTest() {
    console.log(`Starting Load Test with ${NUM_PLAYERS} Players...`);

    // Start host
    clients.push(new BotClient(0, true));

    // Start remaining bots
    for (let i = 1; i < NUM_PLAYERS; i++) {
        // Stagger connection slightly
        setTimeout(() => {
            clients.push(new BotClient(i));
        }, i * 50);
    }

    // Print metrics every 2 seconds
    const metricsInterval = setInterval(printMetrics, 2000);

    // End test after Round Duration + 15 seconds (for voting)
    setTimeout(() => {
        clearInterval(metricsInterval);
        console.log('🛑 Load Test Finished. Unplugging bots...');
        clients.forEach(c => c.ws.close());
        printMetrics(); // Final print
        process.exit(0);
    }, ROUND_DURATION + 15000);
}

runLoadTest();
