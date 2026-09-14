import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

import { Redis, RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('CRITICAL: REDIS_URL environment variable is not defined!');
}

const targetUrl = redisUrl || 'redis://localhost:6379';
const isTls = targetUrl.startsWith('rediss://');

export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isTls && {
    tls: {
      rejectUnauthorized: false
    }
  })
};

export const redisConnection = new Redis(targetUrl, redisOptions);