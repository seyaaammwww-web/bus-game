import { Queue, Worker } from 'bullmq';
import { redisClient } from '../container';
import { gameManager } from '../gameManager';

// Create a queue for ghost cleanup
export const cleanupQueue = redisClient ? new Queue('ghost-cleanup', { connection: redisClient as any }) : null;

/**
 * BullMQ Worker for ghost player cleanup.
 * Runs every 45-60 seconds to prune players who disconnected and never returned.
 */
if (redisClient) {
    const worker = new Worker('ghost-cleanup', async (job) => {
        console.log(`[GhostCleanup] Starting job ${job.id}...`);
        try {
            await gameManager.cleanupGhosts();
            console.log(`[GhostCleanup] Completed job ${job.id}.`);
        } catch (err) {
            console.error(`[GhostCleanup] Error in job ${job.id}:`, err);
        }
    }, { connection: redisClient as any, concurrency: 1 });

    worker.on('failed', (job, err) => {
        console.error(`[GhostCleanup] Job ${job?.id} failed:`, err);
    });
}

/**
 * Schedules the repeatable cleanup job.
 */
export async function startGhostCleanupJob() {
    if (cleanupQueue) {
        // Clean up existing repeatable jobs to avoid duplicates on restart
        const repeatableJobs = await cleanupQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await cleanupQueue.removeRepeatableByKey(job.key);
        }

        await cleanupQueue.add('periodic-cleanup', {}, {
            repeat: { every: 45000 } // Every 45 seconds
        });
        console.log('[GhostCleanup] Scheduled repeatable job (every 45s).');
    } else {
        console.warn('[GhostCleanup] BullMQ skipped: Redis client not initialized.');
    }
}
