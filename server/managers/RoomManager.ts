
import { randomUUID } from 'crypto';
import { CorruptionProofBuffer } from '../utils/reliability';
import type { GameRoom, Player } from '../../shared/schema';
import { getRandomLetters } from '../../shared/arabicWords';

const MAX_ROOMS = 100;
const PUBLIC_ROOM_CODE = 'PLAY';

export class RoomManager {
    private rooms: Map<string, CorruptionProofBuffer<GameRoom>> = new Map();

    constructor() {
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
            totalRounds: 3, // Reduced for testing
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
        if (room.players.length >= 8) throw new Error('الغرفة ممتلئة');
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
            if (draft.phase !== 'lobby') {
                // Reset if game ended? Or handle new public room logic (advanced)
                // For now, simple check
            }

            const isFirst = draft.players.length === 0;
            const player = this.createPlayerObject(playerId, playerName, isFirst);
            if (isFirst) draft.hostId = playerId;

            draft.players.push(player);
        }, "joinPublicRoom");

        return buffer.get();
    }

    removePlayerFromRoom(roomCode: string, playerId: string) {
        const buffer = this.rooms.get(roomCode);
        if (!buffer) return;

        buffer.transact((draft) => {
            draft.players = draft.players.filter(p => p.id !== playerId);

            // Handle Host Migration
            if (draft.players.length > 0 && draft.hostId === playerId) {
                draft.hostId = draft.players[0].id;
                draft.players[0].isHost = true;
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

    private generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return this.rooms.has(code) ? this.generateRoomCode() : code;
    }


    private startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            for (const [code, buffer] of this.rooms.entries()) {
                const room = buffer.get();
                // Remove if empty for > 10 min OR created > 24h
                const isEmpty = room.players.length === 0;
                const isOld = now - room.createdAt > 24 * 60 * 60 * 1000;

                if ((isEmpty && now - room.createdAt > 10 * 60 * 1000) || isOld) {
                    this.rooms.delete(code);
                    console.log(`[RoomManager] Cleaned up room ${code}`);
                }
            }
        }, 60 * 60 * 1000);
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
