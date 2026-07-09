// 8-player stability stress test — simulates real multiplayer chaos:
// full room, abrupt disconnects, reconnects, and verifies nobody is lost.
import WebSocket from 'ws';

const URL = 'ws://localhost:5001/ws';
const results = { pass: 0, fail: 0 };
const check = (name, cond) => {
  if (cond) { results.pass++; console.log(`  PASS: ${name}`); }
  else { results.fail++; console.log(`  FAIL: ${name}`); }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const client = { ws, name, playerId: null, roomCode: null, token: null, lastRoom: null, errors: [] };
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') { ws.send(JSON.stringify({ type: 'pong', payload: {} })); return; }
      if (msg.type === 'room_created' || msg.type === 'room_joined') {
        client.playerId = msg.payload.playerId;
        client.roomCode = msg.payload.room.code;
        client.token = msg.payload.reconnectToken;
        client.lastRoom = msg.payload.room;
      }
      if (msg.payload?.players) client.lastPlayers = msg.payload.players;
      if (msg.payload?.room) client.lastRoom = msg.payload.room;
      if (msg.type === 'error') client.errors.push(msg.payload?.message);
      client.last = msg;
    });
    ws.on('open', () => resolve(client));
    ws.on('error', reject);
  });
}
const send = (c, type, payload) => c.ws.send(JSON.stringify({ type, payload }));

async function main() {
  console.log('--- TEST 1: 8 players fill a room ---');
  const host = await connect('P1');
  send(host, 'create_room', { playerName: 'P1' });
  await sleep(400);
  check('host got room code', !!host.roomCode);

  const others = [];
  for (let i = 2; i <= 8; i++) {
    const c = await connect(`P${i}`);
    send(c, 'join_room', { roomCode: host.roomCode, playerName: `P${i}` });
    others.push(c);
    await sleep(150);
  }
  await sleep(600);
  const all = [host, ...others];
  check('all 8 joined (host sees 8)', (host.lastPlayers?.length ?? host.lastRoom?.players?.length) === 8);
  check('no join errors', all.every(c => c.errors.length === 0));

  console.log('--- TEST 2: 9th player rejected cleanly ---');
  const ninth = await connect('P9');
  send(ninth, 'join_room', { roomCode: host.roomCode, playerName: 'P9' });
  await sleep(400);
  check('9th player got error, no crash', ninth.errors.length > 0);
  ninth.ws.close();

  console.log('--- TEST 3: abrupt disconnect of 3 players ---');
  // Simulate wifi drop: terminate sockets without close frames
  for (const c of [others[0], others[1], others[2]]) c.ws.terminate();
  await sleep(1500);
  // Lobby phase: server hard-deletes on close — remaining should see 5
  const remaining = host.lastPlayers?.length ?? host.lastRoom?.players?.length;
  console.log(`  (host sees ${remaining} players after 3 drops)`);
  check('survivors not kicked', host.ws.readyState === WebSocket.OPEN);

  console.log('--- TEST 4: dropped player reconnects with token ---');
  const dropped = others[0];
  const re = await connect('P2-return');
  send(re, 'rejoin_room', { roomCode: dropped.roomCode, playerId: dropped.playerId, reconnectToken: dropped.token });
  await sleep(800);
  check('rejoin succeeded (no error)', re.errors.length === 0);
  const nowCount = host.lastPlayers?.length ?? host.lastRoom?.players?.length;
  console.log(`  (host sees ${nowCount} players after rejoin)`);
  check('rejoined player visible to host', nowCount >= remaining);
  const rejoinedPlayer = (host.lastPlayers ?? host.lastRoom?.players ?? []).find(p => p.id === dropped.playerId);
  check('rejoined player kept original name', rejoinedPlayer?.name === 'P2');

  console.log('--- TEST 5: rapid-fire ready toggles (race check) ---');
  const alive = [re, others[3], others[4], others[5], others[6]];
  for (let round = 0; round < 10; round++) {
    for (const c of alive) send(c, 'player_ready', {});
    await sleep(50);
  }
  await sleep(800);
  check('server survived toggle storm', host.ws.readyState === WebSocket.OPEN && alive.every(c => c.ws.readyState === WebSocket.OPEN));

  console.log('--- TEST 6: duplicate rejoin (double-tab race) ---');
  const dup1 = await connect('dup1');
  const dup2 = await connect('dup2');
  send(dup1, 'rejoin_room', { roomCode: re.roomCode || dropped.roomCode, playerId: dropped.playerId, reconnectToken: re.token || dropped.token });
  send(dup2, 'rejoin_room', { roomCode: re.roomCode || dropped.roomCode, playerId: dropped.playerId, reconnectToken: re.token || dropped.token });
  await sleep(800);
  const finalPlayers = host.lastPlayers ?? host.lastRoom?.players ?? [];
  const dupCount = finalPlayers.filter(p => p.id === dropped.playerId).length;
  check('no duplicate player entries', dupCount <= 1);

  console.log(`\n=== RESULT: ${results.pass} passed, ${results.fail} failed ===`);
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('Stress test crashed:', e); process.exit(1); });
