import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

import { Redis, RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('CRITICAL: REDIS_URL is not set. process.env is missing REDIS_URL.');
}

const targetUrl = redisUrl || 'redis://127.0.0.1:6379';
const isTls = targetUrl.startsWith('rediss://');

export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  ...(isTls && {
    tls: {
      rejectUnauthorized: false
    }
  })
};

export const redisConnection = new Redis(targetUrl, redisOptions);

redisConnection.on('error', (err) => {
  console.error('Redis connection error in API:', err.message);
});