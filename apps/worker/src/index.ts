import { Worker, Job } from 'bullmq';
import { QUEUE_NAME, TranscodeJobPayload } from '@optiqueue/shared';
import fs from 'fs';
import path from 'path';
import { redisConnection } from './config/redis';
import { transcodeMedia } from './processors/transcode.processor';
import { uploadToStorage } from './services/storage.service';
import { db } from './services/db.service';

export * from './processors/transcode.processor';

const worker = new Worker<TranscodeJobPayload>(
  QUEUE_NAME,
  async (job: Job<TranscodeJobPayload>) => {
    const { jobId, originalFileName, inputPath, targetFormat, fileSize } = job.data;

    await db.createJob(jobId, originalFileName, fileSize);
    await db.updateJobProcessing(jobId);
    await job.updateProgress(10);

    const transcodeResult = await transcodeMedia(inputPath, targetFormat, async (percent) => {
      await job.updateProgress(10 + Math.round(percent * 0.7));
    });

    await job.updateProgress(85);

    const destinationKey = `optimized/${jobId}${path.extname(transcodeResult.outputPath)}`;
    const storageUrl = await uploadToStorage(transcodeResult.outputPath, destinationKey);

    await db.updateJobCompleted(jobId, transcodeResult.transcodedSize, storageUrl);
    await job.updateProgress(100);

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    if (fs.existsSync(transcodeResult.outputPath)) {
      fs.unlinkSync(transcodeResult.outputPath);
    }

    return {
      storageUrl,
      originalSize: transcodeResult.originalSize,
      transcodedSize: transcodeResult.transcodedSize
    };
  },
  {
    connection: redisConnection,
    concurrency: 1
  }
);

worker.on('ready', () => {
  console.log(`Worker active and listening on queue: ${QUEUE_NAME}`);
});

worker.on('completed', (job: Job) => {
  console.log(`Job ${job.id} completed and uploaded to Supabase`);
});

worker.on('failed', async (job: Job | undefined, err: Error) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
  if (job?.data?.jobId) {
    await db.updateJobFailed(job.data.jobId);
  }
});

const shutdown = async () => {
  await worker.close();
  await redisConnection.quit();
  await db.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);