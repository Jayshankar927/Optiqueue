import { Queue } from 'bullmq';
import { QUEUE_NAME, TranscodeJobPayload } from '@optiqueue/shared';
import { redisOptions } from '../config/redis';

export const mediaQueue = new Queue<TranscodeJobPayload>(QUEUE_NAME, {
  connection: redisOptions,
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