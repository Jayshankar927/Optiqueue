import { Queue } from 'bullmq';
import { QUEUE_NAME, TranscodeJobPayload } from '@optiqueue/shared';
import { redisConnection } from '../config/redis';

export const mediaQueue = new Queue<TranscodeJobPayload>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});