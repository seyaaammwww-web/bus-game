
import { randomUUID } from 'crypto';
import { CorruptionProofBuffer } from '../utils/reliability';
import type { GameRoom, Player } from '../../shared/schema';
import { getRandomLetters } from '../../shared/arabicWords';

const MAX_ROOMS = 100;
const PUBLIC_ROOM_CODE = 'PLAY';

export class RoomManager {
    private rooms: Map<string, CorruptionProofBuffer<GameRoom>> = new Map();

    // PERSIST-1 FIX: Public accessor so StateOrchestrator doesn't need @ts-ignore
    public getAllBuffers(): CorruptionProofBuffer<GameRoom>[] {
        return Array.from(this.rooms.values());
    }

    // V3-14 FIX: Constructor accepts callback to notify GameManager of room deletion
    constructor(private onRoomDeleted?: (code: string) => void) {
        this.startCleanupInterval();
    }

    createRoom(hostPlayerId: string, playerName: string): { room: GameRoom, isNew: boolean } {
        if (this.rooms.size >= MAX_ROOMS) {
            throw new Error('السيرفر مشغول جداً');
        }

        const roomCode = this.generateRoomCode();
        const roomId = randomUUID();

        const player: Player = this.createPlayerObject(hostPlayerId, playerName, true);

        const room: GameRoom = {
            id: roomId,
            code: roomCode,
            hostId: hostPlayerId,
            players: [player],
            rounds: [],
            currentRound: 0,
            totalRounds: 10,
            phase: 'lobby',
            letters: getRandomLetters(10),
            createdAt: Date.now(),
            voteQueue: [],
            currentVote: null,
            settings: {
                enableVoting: false,
                customCategories: []
            }
        };

        this.rooms.set(roomCode, new CorruptionProofBuffer(room));
        return { room, isNew: true };
    }

    getRoom(roomCode: string): GameRoom | undefined {
        return this.rooms.get(roomCode)?.get();
    }

    getRoomBuffer(roomCode: string): CorruptionProofBuffer<GameRoom> | undefined {
        return this.rooms.get(roomCode);
    }

    joinRoom(roomCode: string, playerId: string, playerName: string): GameRoom {
        const buffer = this.rooms.get(roomCode);
        if (!buffer) throw new Error('الغرفة مش موجودة');

        let room = buffer.get();

        // Check constraints
        if (room.phase !== 'lobby') throw new Error('اللعبة بدأت');
        if (room.players.length >= 50) throw new Error('الغرفة ممتلئة');
        if (room.players.find(p => p.id === playerId)) return room; // Already joined

        buffer.transact((draft) => {
            const player = this.createPlayerObject(playerId, playerName, false);
            draft.players.push(player);
        }, "joinRoom");

        return buffer.get();
    }

    joinPublicRoom(playerId: string, playerName: string): GameRoom {
        let buffer = this.rooms.get(PUBLIC_ROOM_CODE);

        if (!buffer) {
            // Create public room if not exists
            const room: GameRoom = {
                id: randomUUID(),
                code: PUBLIC_ROOM_CODE,
                hostId: '',
                players: [],
                rounds: [],
                currentRound: 0,
                totalRounds: 10,
                phase: 'lobby',
                letters: getRandomLetters(10),
                createdAt: Date.now(),
                isPublicRoom: true,
                settings: { enableVoting: false }
            };
            buffer = new CorruptionProofBuffer(room);
            this.rooms.set(PUBLIC_ROOM_CODE, buffer);
        }

        buffer.transact((draft) => {
            // RMgr1: Guard — cannot join a public room that's already in progress
            if (draft.phase !== 'lobby') {
                throw new Error('اللعبة بدأت بالفعل، انتظر الجولة القادمة');
            }

            const isFirst = draft.players.length === 0;
            const player = this.createPlayerObject(playerId, playerName, isFirst);
            if (isFirst) draft.hostId = playerId;

            draft.players.push(player);
        }, "joinPublicRoom");

        return buffer.get();
    }

    removePlayerFromRoom(roomCode: string, playerId: string, hardDelete: boolean = false) {
        const buffer = this.rooms.get(roomCode);
        if (!buffer) return;

        buffer.transact((draft) => {
            if (hardDelete || draft.phase === 'lobby') {
                draft.players = draft.players.filter(p => p.id !== playerId);
            } else {
                const player = draft.players.find(p => p.id === playerId);
                if (player) {
                    player.isOffline = true;
                }
            }

            // Handle Host Migration
            const onlinePlayers = draft.players.filter(p => !p.isOffline);
            if (onlinePlayers.length > 0 && draft.hostId === playerId) {
                // P1-1 FIX: Clear old host flag FIRST to prevent dual-host
                const oldHost = draft.players.find(p => p.id === playerId);
                if (oldHost) oldHost.isHost = false;

                draft.hostId = onlinePlayers[0].id;
                onlinePlayers[0].isHost = true;
            }
        }, "removePlayer");

        // If empty, cleanup is handled by interval
    }

    private createPlayerObject(id: string, name: string, isHost: boolean): Player {
        return {
            id,
            name,
            score: 0,
            isHost,
            isReady: false,
            busStreak: 0,
            powerUps: { hint: 0, steal: 0, wildcard: 0, banish: 0 },
            usedPowerUps: { hint: false, steal: false, wildcard: false, banish: false },
            totalEarnedPoints: 0,
        };
    }

    private generateRoomCode(depth: number = 0): string {
        if (depth > 20) throw new Error("Could not generate unique room code after 20 attempts");
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return this.rooms.has(code) ? this.generateRoomCode(depth + 1) : code;
    }


    private startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            for (const [code, buffer] of this.rooms.entries()) {
                const room = buffer.get();
                // V3-10 FIX: Check if room only has offline players, not just if array is completely empty
                const isEmpty = room.players.filter(p => !p.isOffline).length === 0;
                const isOld = now - room.createdAt > 24 * 60 * 60 * 1000;

                if ((isEmpty && now - room.createdAt > 10 * 60 * 1000) || isOld) {
                    this.rooms.delete(code);
                    if (this.onRoomDeleted) this.onRoomDeleted(code); // V3-14 FIX: Invoke cleanup callback
                    console.log(`[RoomManager] Cleaned up room ${code}`);
                }
            }
        }, 5 * 60 * 1000); // P2-9 FIX: 5 min instead of 60 min for faster memory reclamation
    }

    // Persistence Helpers
    getAllRoomBuffers(): GameRoom[] {
        const rooms: GameRoom[] = [];
        for (const buffer of this.rooms.values()) {
            rooms.push(buffer.get());
        }
        return rooms;
    }

    restoreRoom(room: GameRoom) {
        this.rooms.set(room.code, new CorruptionProofBuffer(room));
    }
}
