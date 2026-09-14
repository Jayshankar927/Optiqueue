import { Redis, RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is missing.');
}

const isTls = redisUrl.startsWith('rediss://');

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isTls && {
    tls: {
      rejectUnauthorized: false
    }
  })
};

export const redisConnection = new Redis(redisUrl, redisOptions);