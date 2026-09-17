import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

import { Redis, RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('FATAL: REDIS_URL environment variable is missing in process.env!');
}

const isTls = redisUrl.startsWith('rediss://');

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

export const redisConnection = new Redis(redisUrl, redisOptions);

redisConnection.on('connect', () => {
  console.log('Successfully connected to Redis instance.');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error in API:', err.message);
});