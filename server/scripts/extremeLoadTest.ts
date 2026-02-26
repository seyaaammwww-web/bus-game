import WebSocket from 'ws';
import os from 'os';

const SERVER_URL = process.env.WS_URL || 'ws://localhost:5001/ws';
const NUM_PLAYERS = parseInt(process.env.NUM_PLAYERS || '100');
const NUM_ROOMS = parseInt(process.env.NUM_ROOMS || '5');
const CHURN_MODE = process.env.CHURN_MODE === 'true';
const ROUND_DURATION = parseInt(process.env.ROUND_DURATION || '15000'); // ms

interface Metrics {
    latencies: number[];
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    activeConnections: number;
}

const metrics: Metrics = {
    latencies: [],
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    activeConnections: 0,
};

let roomCodes: string[] = [];
let clients: BotClient[] = [];

class BotClient {
    ws: WebSocket | null = null;
    id: number;
    roomId: string = '';
    isHost: boolean;
    pingInterval: NodeJS.Timeout | null = null;
    draftInterval: NodeJS.Timeout | null = null;
    lastPingSentTime: number = 0;
    intentionalClose: boolean = false;

    constructor(id: number, isHost: boolean = false, roomIndex: number) {
        this.id = id;
        this.isHost = isHost;
        this.connect();
    }

    connect() {
        this.intentionalClose = false;
        this.ws = new WebSocket(SERVER_URL);
        this.ws.on('open', this.onOpen.bind(this));
        this.ws.on('message', this.onMessage.bind(this));
        this.ws.on('error', this.onError.bind(this));
        this.ws.on('close', this.onClose.bind(this));
    }

    send(type: string, payload?: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
            metrics.messagesSent++;
        }
    }

    onOpen() {
        metrics.activeConnections++;
        const roomIndex = Math.floor(this.id / (NUM_PLAYERS / NUM_ROOMS));

        if (this.isHost) {
            this.send('create_room', { playerName: `HostBot_${this.id}` });
        } else {
            const checkRoom = setInterval(() => {
                if (roomCodes[roomIndex]) {
                    clearInterval(checkRoom);
                    this.send('join_room', { roomCode: roomCodes[roomIndex], playerName: `Bot_${this.id}` });
                }
            }, 500);
        }

        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.lastPingSentTime = Date.now();
                this.send('ping');
            }
        }, 5000);

        if (CHURN_MODE && !this.isHost) {
            const churnDelay = Math.random() * 10000 + 5000;
            setTimeout(() => {
                if (!this.intentionalClose) {
                    // console.log(`[Bot_${this.id}] Churn: disconnecting...`);
                    this.ws?.close();
                }
            }, churnDelay);
        }
    }

    onMessage(data: WebSocket.Data) {
        metrics.messagesReceived++;
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'pong' && this.lastPingSentTime) {
                metrics.latencies.push(Date.now() - this.lastPingSentTime);
                if (metrics.latencies.length > 5000) metrics.latencies.shift();
            }
            if (msg.type === 'room_created' && this.isHost) {
                roomCodes.push(msg.payload.room.code);
            }
            if (msg.type === 'round_start') {
                setTimeout(() => {
                    this.send('submit_answers', {
                        answers: { 'ولد': 'أحمد', 'بنت': 'أمل', 'بلد': 'مصر', 'حيوان': 'أسد', 'جماد': 'قلم' }
                    });
                }, Math.random() * 5000 + 2000);
            }
        } catch (e) { metrics.errors++; }
    }

    onError(err: any) { metrics.errors++; }

    onClose() {
        metrics.activeConnections--;
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (CHURN_MODE && !this.intentionalClose) {
            setTimeout(() => this.connect(), 2000);
        }
    }

    stop() {
        this.intentionalClose = true;
        this.ws?.close();
    }
}

function printMetrics() {
    const mem = process.memoryUsage();
    const sorted = [...metrics.latencies].sort((a, b) => a - b);
    const avgLat = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
    const p95Lat = sorted[Math.floor(sorted.length * 0.95)] || 0;

    console.log(`[Metrics] Bots: ${metrics.activeConnections} | MsgRcv: ${metrics.messagesReceived} | LatAvg: ${avgLat}ms | LatP95: ${p95Lat}ms | Mem: ${Math.round(mem.rss / 1024 / 1024)}MB`);
}

async function run() {
    console.log(`🚀 Advanced Load Test: ${NUM_PLAYERS} bots, ${NUM_ROOMS} rooms, Churn: ${CHURN_MODE}`);

    // Create Hosts
    for (let i = 0; i < NUM_ROOMS; i++) {
        clients.push(new BotClient(i, true, i));
    }

    // Create Bots
    for (let i = NUM_ROOMS; i < NUM_PLAYERS; i++) {
        setTimeout(() => {
            clients.push(new BotClient(i, false, Math.floor(i / (NUM_PLAYERS / NUM_ROOMS))));
        }, i * 100);
    }

    const mInt = setInterval(printMetrics, 3000);

    setTimeout(() => {
        clearInterval(mInt);
        console.log('🏁 Test finished. Cleaning up...');
        clients.forEach(c => c.stop());
        setTimeout(() => process.exit(0), 2000);
    }, 60000);
}

run();
