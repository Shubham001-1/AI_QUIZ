const Redis = require('ioredis');

let redis;

const connectRedis = () => {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redis.on('connect', () => {
      console.log('Redis Connected');
    });

    redis.on('error', (err) => {
      console.error('Redis Error:', err.message);
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });

    return redis;
  } catch (error) {
    console.error('Redis Connection Error:', error.message);
    process.exit(1);
  }
};

const getRedis = () => {
  if (!redis) {
    return connectRedis();
  }
  return redis;
};

module.exports = { connectRedis, getRedis };
