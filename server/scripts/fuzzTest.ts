import WebSocket from 'ws';

const SERVER_URL = process.env.WS_URL || 'ws://localhost:5001/ws';

async function fuzz() {
    console.log(`🛡️ Starting Security Fuzzing Test against ${SERVER_URL}...`);

    const ws = new WebSocket(SERVER_URL);

    ws.on('open', async () => {
        console.log('Connected. Running fuzz scenarios...');

        // 1. Oversized Payload
        const hugeString = 'A'.repeat(1024 * 1024 * 2); // 2MB
        console.log('Scenario 1: Sending 2MB payload...');
        ws.send(JSON.stringify({ type: 'create_room', payload: { playerName: hugeString } }));

        await new Promise(r => setTimeout(r, 1000));

        // 2. Invalid Types
        console.log('Scenario 2: Sending invalid types...');
        ws.send(JSON.stringify({ type: 'join_room', payload: { roomCode: 1234, playerName: true } }));

        await new Promise(r => setTimeout(r, 1000));

        // 3. Missing Fields
        console.log('Scenario 3: Sending missing fields...');
        ws.send(JSON.stringify({ type: 'join_room', payload: { roomCode: 'ABCD' } }));

        await new Promise(r => setTimeout(r, 1000));

        // 4. Rate Limit Flood
        console.log('Scenario 4: Flooding messages (Rate Limit check)...');
        for (let i = 0; i < 100; i++) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }

        console.log('Fuzzing batch sent. Waiting for server response/close...');
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log(`[Server Response] ${msg.type}:`, msg.payload?.message || 'OK');
    });

    ws.on('close', (code, reason) => {
        console.log(`[Connection Closed] Code: ${code}, Reason: ${reason}`);
    });

    ws.on('error', (err) => {
        console.error('[WS Error]:', err.message);
    });

    setTimeout(() => {
        console.log('Fuzzing test finished.');
        ws.close();
        process.exit(0);
    }, 10000);
}

fuzz();
