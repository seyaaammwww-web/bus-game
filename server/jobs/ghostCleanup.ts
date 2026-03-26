import { Queue, Worker } from 'bullmq';
import { redisClient } from '../container';
import { gameManager } from '../gameManager';

// Create a queue for ghost cleanup (only if Redis is available)
export const cleanupQueue = redisClient ? new Queue('ghost-cleanup', { connection: redisClient as any }) : null;

/**
 * BullMQ Worker for ghost player cleanup.
 * Note: PlayerManager already handles dead connections via pong timeout.
 * This job handles any edge cases Redis is available for.
 */
if (redisClient) {
    const worker = new Worker('ghost-cleanup', async (job: any) => {
        console.log(`[GhostCleanup] Starting job ${job.id}...`);
        try {
            // تنظيف اللاعبين غير المتصلين فعلياً
            const roomCodes = gameManager.getAllRooms();
            for (const code of roomCodes) {
                const room = gameManager.getRoom(code); // Use public method to get room
                if (!room) continue;
                // Filter players who are NOT isOffline but don't have a socket in PlayerManager
                const ghostPlayers = room.players.filter((p: any) =>
                    !p.isOffline && !gameManager.getPlayerSocket(p.id) // Use public method to get socket
                );
                for (const player of ghostPlayers) {
                    console.log(`[GhostCleanup] Handling disconnect for ghost player ${player.id} in room ${code}`);
                    const ws = gameManager.getPlayerSocket(player.id); // Use public method to get socket
                    if (ws) {
                        gameManager.handleDisconnect(ws);
                    } else {
                        // If no socket, ensure player is removed from room if still present
                        gameManager.removePlayerFromRoom(code, player.id); // Use public method
                    }
                }
            }
            console.log(`[GhostCleanup] Completed job ${job.id} (actual cleanup done).`);
        } catch (err) {
            console.error(`[GhostCleanup] Error in job ${job.id}:`, err);
        }
    }, { connection: redisClient as any, concurrency: 1 });

    worker.on('failed', (job: any, err: any) => {
        console.error(`[GhostCleanup] Job ${job?.id} failed:`, err);
    });
}

/**
 * Schedules the repeatable cleanup job.
 */
export async function startGhostCleanupJob() {
    if (cleanupQueue) {
        const repeatableJobs = await cleanupQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await cleanupQueue.removeRepeatableByKey(job.key);
        }

        await cleanupQueue.add('periodic-cleanup', {}, {
            repeat: { every: 45000 }
        });
        console.log('[GhostCleanup] Scheduled repeatable job (every 45s).');
    } else {
        console.warn('[GhostCleanup] BullMQ skipped: Redis client not initialized.');
    }
}
