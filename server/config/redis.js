import Redis from 'ioredis';

class MockRedis {
  constructor() {
    this.data = new Map();
    this.expirations = new Map();
    this.events = {};
    console.log('📦 [MockRedis] In-Memory Mock Redis Client Initialized');
  }

  on(event, cb) {
    this.events[event] = cb;
    if (event === 'connect') {
      setTimeout(() => {
        if (typeof cb === 'function') cb();
      }, 50);
    }
  }

  _checkExpire(key) {
    if (this.expirations.has(key)) {
      if (this.expirations.get(key) < Date.now()) {
        this.data.delete(key);
        this.expirations.delete(key);
      }
    }
  }

  async exists(key) {
    this._checkExpire(key);
    return this.data.has(key) ? 1 : 0;
  }

  async zincrby(key, increment, member) {
    this._checkExpire(key);
    if (!this.data.has(key)) {
      this.data.set(key, new Map());
    }
    const zset = this.data.get(key);
    if (!(zset instanceof Map)) {
      this.data.set(key, new Map());
    }
    const currentZset = this.data.get(key);
    const score = (currentZset.get(member) || 0) + parseFloat(increment);
    currentZset.set(member, score);
    return score.toString();
  }

  async zrevrange(key, start, stop, withScores) {
    this._checkExpire(key);
    if (!this.data.has(key)) return [];
    const zset = this.data.get(key);
    if (!(zset instanceof Map)) return [];
    
    // Sort descending by score
    const entries = Array.from(zset.entries()).sort((a, b) => b[1] - a[1]);
    const sliced = entries.slice(start, stop === -1 ? undefined : stop + 1);
    
    if (withScores === 'WITHSCORES') {
      const res = [];
      for (const [member, score] of sliced) {
        res.push(member, score.toString());
      }
      return res;
    }
    return sliced.map(e => e[0]);
  }

  async zscore(key, member) {
    this._checkExpire(key);
    if (!this.data.has(key)) return null;
    const zset = this.data.get(key);
    if (!(zset instanceof Map)) return null;
    const score = zset.get(member);
    return score !== undefined ? score.toString() : null;
  }

  async zrevrank(key, member) {
    this._checkExpire(key);
    if (!this.data.has(key)) return null;
    const zset = this.data.get(key);
    if (!(zset instanceof Map)) return null;
    const entries = Array.from(zset.entries()).sort((a, b) => b[1] - a[1]);
    const idx = entries.findIndex(e => e[0] === member);
    return idx !== -1 ? idx : null;
  }

  async set(key, value) {
    this._checkExpire(key);
    this.data.set(key, value.toString());
    return 'OK';
  }

  async incr(key) {
    this._checkExpire(key);
    const val = parseInt(this.data.get(key) || '0', 10) + 1;
    this.data.set(key, val.toString());
    return val;
  }

  async sadd(key, member) {
    this._checkExpire(key);
    if (!this.data.has(key)) {
      this.data.set(key, new Set());
    }
    const set = this.data.get(key);
    if (!(set instanceof Set)) {
      this.data.set(key, new Set([member]));
      return 1;
    }
    if (set.has(member)) return 0;
    set.add(member);
    return 1;
  }

  async sismember(key, member) {
    this._checkExpire(key);
    if (!this.data.has(key)) return 0;
    const set = this.data.get(key);
    if (!(set instanceof Set)) return 0;
    return set.has(member) ? 1 : 0;
  }

  async keys(pattern) {
    const escaped = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`);
    const results = [];
    for (const key of this.data.keys()) {
      this._checkExpire(key);
      if (this.data.has(key) && regex.test(key)) {
        results.push(key);
      }
    }
    return results;
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.data.delete(key)) {
        this.expirations.delete(key);
        count++;
      }
    }
    return count;
  }

  async expire(key, seconds) {
    if (this.data.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }
}

let activeClient = null;
let isMock = false;
const connectListeners = [];

const redisProxy = new Proxy({}, {
  get(target, prop) {
    if (prop === 'on') {
      return (event, cb) => {
        if (event === 'connect') {
          connectListeners.push(cb);
        }
        if (activeClient && typeof activeClient.on === 'function') {
          activeClient.on(event, cb);
        }
      };
    }

    if (activeClient && typeof activeClient[prop] === 'function') {
      return activeClient[prop].bind(activeClient);
    }

    return activeClient ? activeClient[prop] : undefined;
  }
});

const connectRedis = () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`Connecting to Redis at ${redisUrl}...`);

    const realRedis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null, // Fail fast on error
    });

    activeClient = realRedis;

    realRedis.on('connect', () => {
      console.log('Redis Connected');
      connectListeners.forEach(cb => cb());
    });

    realRedis.on('error', (err) => {
      if (!isMock) {
        console.warn(`⚠️ Redis Connection Error: ${err.message}. Falling back to In-Memory Mock Redis.`);
        isMock = true;
        activeClient = new MockRedis();
        // Invoke stored connect listeners
        connectListeners.forEach(cb => cb());
      }
    });

    realRedis.on('close', () => {
      if (!isMock) {
        console.log('Redis connection closed');
      }
    });

    return redisProxy;
  } catch (error) {
    console.warn(`⚠️ Failed to initialize Redis client: ${error.message}. Falling back to In-Memory Mock Redis.`);
    isMock = true;
    activeClient = new MockRedis();
    return redisProxy;
  }
};

const getRedis = () => {
  if (!activeClient) {
    return connectRedis();
  }
  return redisProxy;
};

export { connectRedis, getRedis };

