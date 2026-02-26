import WebSocket from 'ws';

const SERVER_URL = 'ws://localhost:5001/ws';

async function testTimeout() {
    console.log(`🧪 Starting AI Timeout Fallback Test...`);
    const ws = new WebSocket(SERVER_URL);
    let startTime = 0;

    ws.on('open', () => {
        console.log('Connected. Creating room...');
        ws.send(JSON.stringify({ type: 'create_room', payload: { playerName: 'TimeoutTester' } }));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'room_created') {
            const roomCode = msg.payload.room.code;
            console.log(`Room created: ${roomCode}. Starting game...`);
            ws.send(JSON.stringify({ type: 'start_game' }));
        }

        if (msg.type === 'round_start') {
            console.log('Round started. Submitting answers...');
            ws.send(JSON.stringify({
                type: 'submit_answers',
                payload: {
                    answers: { 'ولد': 'أحمد', 'بنت': 'أمل', 'بلد': 'مصر', 'حيوان': 'أسد', 'جماد': 'كرسي' }
                }
            }));
            startTime = Date.now();
        }

        if (msg.type === 'sync_state') {
            const phase = msg.payload.room.phase;
            if (phase === 'calculating') {
                console.log('Entered Calculating phase...');
            }
            if (phase === 'voting') {
                const duration = (Date.now() - startTime) / 1000;
                console.log(`✅ Success: Entered Voting phase after ${duration.toFixed(2)}s`);
                if (duration >= 5.5 && duration <= 8) {
                    console.log('VERIFIED: Falling back to voting within the expected timeout window (approx 6s).');
                } else {
                    console.warn('WARNING: Transition time outside expected 6s window.');
                }
                process.exit(0);
            }
        }

        if (msg.type === 'error') {
            console.error('Server error:', msg.payload.message);
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.error('Test timed out without reaching voting phase.');
        process.exit(1);
    }, 15000);
}

testTimeout();
