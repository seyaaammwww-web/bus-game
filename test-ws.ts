import { WebSocket } from 'ws';
const ws = new WebSocket('ws://localhost:5001/ws');

ws.on('open', () => {
    console.log('Connected');
    ws.send(JSON.stringify({ type: 'join_room', payload: { roomCode: 'TEST', playerName: 'Player2' } }));
});

ws.on('message', (data) => console.log('Msg:', data.toString()));
ws.on('error', (err) => console.error('Error:', err));
ws.on('close', () => console.log('Closed'));
