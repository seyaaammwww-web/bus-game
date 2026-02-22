
import fs from 'fs';
import path from 'path';
import { RoomManager } from '../managers/RoomManager';
import { GameRoom } from '../../shared/schema';
import { CorruptionProofBuffer } from '../utils/reliability';

const SNAPSHOT_FILE = path.join(process.cwd(), 'server', 'data', 'gamestate.snapshot.json');

export class StateOrchestrator {
    private roomManager: RoomManager;
    private saveInterval: NodeJS.Timeout | null = null;

    constructor(roomManager: RoomManager) {
        this.roomManager = roomManager;
    }

    startAutoSave(intervalMs: number = 30000) {
        if (this.saveInterval) clearInterval(this.saveInterval);

        // Ensure directory exists
        const dir = path.dirname(SNAPSHOT_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.saveInterval = setInterval(() => {
            this.saveState();
        }, intervalMs);

        console.log(`[Persistence] Auto-save enabled (every ${intervalMs / 1000}s)`);
    }

    stopAutoSave() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
    }

    async saveState() {
        try {
            const rooms = await this.roomManager.getAllRoomBuffers();
            const state = {
                timestamp: Date.now(),
                rooms
            };

            await fs.promises.writeFile(SNAPSHOT_FILE, JSON.stringify(state, null, 2));
        } catch (e) {
            console.error('[Persistence] Save failed:', e);
        }
    }

    async loadState() {
        if (!fs.existsSync(SNAPSHOT_FILE)) {
            console.log('[Persistence] No snapshot found. Starting fresh.');
            return;
        }

        try {
            const data = await fs.promises.readFile(SNAPSHOT_FILE, 'utf-8');
            const state = JSON.parse(data);

            if (!state.rooms || !Array.isArray(state.rooms)) {
                console.error('[Persistence] Invalid snapshot format');
                return;
            }

            await this.roomManager.restoreRooms(state.rooms);
            console.log(`[Persistence] Restored ${state.rooms.length} rooms from snapshot.`);
        } catch (e) {
            console.error('[Persistence] Load failed:', e);
        }
    }
}
