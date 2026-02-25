import Redis from 'ioredis';
import { env } from './env';

// Use a global variable to prevent multiple Redis instances in dev (HMR)
const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
    redisSub: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

export const redisSub = globalForRedis.redisSub ?? new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
    globalForRedis.redisSub = redisSub;
}

redis.on('error', (err) => {
    console.error('Redis Error:', err);
});

redis.on('connect', () => {
    console.log('Redis Connected');
});
