
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
            // We need access to rooms in RoomManager. 
            // I need to add a method to RoomManager to get all buffers or iterate.
            // Since RoomManager.rooms is private, I should add a getter or access it if I can make it public/internal.
            // For now, let's assume I'll add `getAllRoomBuffers()` to RoomManager.

            const rooms: GameRoom[] = [];
            // PERSIST-1 FIX: Use public accessor instead of @ts-ignore
            for (const buffer of this.roomManager.getAllBuffers()) {
                rooms.push(buffer.get());
            }

            const state = {
                timestamp: Date.now(),
                rooms
            };

            await fs.promises.writeFile(SNAPSHOT_FILE, JSON.stringify(state, null, 2));
            // console.log(`[Persistence] Saved ${rooms.length} rooms`);
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

            // Restore
            for (const roomData of state.rooms) {
                // PERSIST-1 & V3-19 FIX: Use proper method to restore rooms without @ts-ignore
                this.roomManager.restoreRoom(roomData);
            }

            console.log(`[Persistence] Restored ${state.rooms.length} rooms from snapshot.`);
        } catch (e) {
            console.error('[Persistence] Load failed:', e);
        }
    }
}
