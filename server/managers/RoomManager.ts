import { randomUUID } from 'crypto';
import { CorruptionProofBuffer } from '../utils/reliability';
import type { GameRoom, Player } from '../../shared/schema';
import { getRandomLetters } from '../../shared/arabicWords';
import { IRoomRepository } from '../repositories/roomRepository';
import { roomRepository } from '../container';

const PUBLIC_ROOM_CODE = 'PLAY';

export class RoomManager {
    private repository: IRoomRepository;

    constructor() {
        this.repository = roomRepository;
    }

    async createRoom(hostPlayerId: string, playerName: string): Promise<{ room: GameRoom, isNew: boolean }> {
        const roomCode = await this.generateRoomCode();
        const roomId = randomUUID();

        const player: Player = this.createPlayerObject(hostPlayerId, playerName, true);
        player.status = 'active';

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

        await this.repository.set(roomCode, room);
        return { room, isNew: true };
    }

    async getRoom(roomCode: string): Promise<GameRoom | null> {
        return await this.repository.get(roomCode.toUpperCase());
    }

    /**
     * Atomic Transaction Wrapper for Room State.
     * Fetches, Mutates, and Saves with Distributed Locking.
     */
    async transact(roomCode: string, mutator: (draft: GameRoom) => void, description: string): Promise<GameRoom> {
        const code = roomCode.toUpperCase();

        // Acquire distributed lock (safe for multi-server)
        const locked = await this.repository.acquireLock(code);
        if (!locked) throw new Error(`فشل في تأمين الغرفة ${code} - حاول مرة أخرى`);

        try {
            const room = await this.repository.get(code);
            if (!room) throw new Error(`الغرفة ${code} غير موجودة`);

            const buffer = new CorruptionProofBuffer(room);
            buffer.transact(mutator, description);

            const updatedRoom = buffer.get();
            await this.repository.set(code, updatedRoom);
            return updatedRoom;
        } finally {
            await this.repository.releaseLock(code);
        }
    }

    async joinRoom(roomCode: string, playerId: string, playerName: string): Promise<GameRoom> {
        const code = roomCode.toUpperCase();
        const room = await this.getRoom(code);
        if (!room) throw new Error('الغرفة مش موجودة');

        // Check constraints
        if (room.phase !== 'lobby') throw new Error('اللعبة بدأت');
        if (room.players.length >= 8) throw new Error('الغرفة ممتلئة');
        if (room.players.find(p => p.id === playerId)) return room;

        return await this.transact(code, (draft) => {
            const player = this.createPlayerObject(playerId, playerName, false);
            player.status = 'active';
            draft.players.push(player);
        }, "joinRoom");
    }

    async joinPublicRoom(playerId: string, playerName: string): Promise<GameRoom> {
        const exists = await this.repository.exists(PUBLIC_ROOM_CODE);

        if (!exists) {
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
            await this.repository.set(PUBLIC_ROOM_CODE, room);
        }

        return await this.transact(PUBLIC_ROOM_CODE, (draft) => {
            const isFirst = draft.players.length === 0;
            const player = this.createPlayerObject(playerId, playerName, isFirst);
            player.status = 'active';
            if (isFirst) draft.hostId = playerId;
            draft.players.push(player);
        }, "joinPublicRoom");
    }

    async removePlayerFromRoom(roomCode: string, playerId: string): Promise<void> {
        try {
            await this.transact(roomCode, (draft) => {
                const wasHost = draft.hostId === playerId;
                draft.players = draft.players.filter(p => p.id !== playerId);

                // Handle Host Migration
                if (draft.players.length > 0 && wasHost) {
                    draft.hostId = draft.players[0].id;
                    draft.players[0].isHost = true;
                }
            }, "removePlayer");
        } catch (e) {
            // Silently fail if room already deleted
        }
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

    private async generateRoomCode(): Promise<string> {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        const exists = await this.repository.exists(code);
        return exists ? this.generateRoomCode() : code;
    }

    async getAllRoomBuffers(): Promise<GameRoom[]> {
        const codes = await this.repository.getAllCodes();
        const rooms: GameRoom[] = [];
        for (const code of codes) {
            const room = await this.repository.get(code);
            if (room) rooms.push(room);
        }
        return rooms;
    }

    async restoreRooms(rooms: GameRoom[]): Promise<void> {
        for (const room of rooms) {
            await this.repository.set(room.code, room);
        }
    }
}
