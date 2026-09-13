import { Worker, Job } from 'bullmq';
import { QUEUE_NAME, TranscodeJobPayload } from '@optiqueue/shared';
import { redisOptions } from './config/redis';
import { transcodeMedia } from './processors/transcode.processor';

export * from './processors/transcode.processor';

const worker = new Worker<TranscodeJobPayload>(
    QUEUE_NAME,
    async (job: Job<TranscodeJobPayload>) => {
        await job.updateProgress(10);

        const { inputPath, targetFormat } = job.data;
        const result = await transcodeMedia(inputPath, targetFormat, async (percent) => {
            await job.updateProgress(percent);
        });
        await job.updateProgress(100);
        return result;
    },
    {
        connection: redisOptions,
        concurrency: 1
    }
);

worker.on('ready', () => {
  console.log(`Worker active and listening on queue: ${QUEUE_NAME}`);
});

worker.on('completed', (job: Job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

const shutdown = async () => {
    await worker.close();
    console.log('Worker and Redis connection closed gracefully');
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);