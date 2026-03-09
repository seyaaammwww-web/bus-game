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
            const rooms = gameManager.getAllRooms();
            for (const room of rooms) {
                const disconnectedPlayers = room.players.filter(p =>
                    !gameManager.playerManager.isConnected(p.id)
                );
                for (const player of disconnectedPlayers) {
                    gameManager.handlePlayerDisconnect(player.id, room.code);
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
