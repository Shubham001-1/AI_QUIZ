import { getRedis } from '../config/redis.js';

const initLeaderboard = async (roomCode) => {
  const redis = getRedis();
  const key = `quiz:leaderboard:${roomCode}`;
  // Check if leaderboard already exists — don't wipe it if it does
  const exists = await redis.exists(key);
  if (exists) {
    console.log(`Leaderboard already exists for room: ${roomCode}, keeping scores`);
    return;
  }
  // No sorted set yet — it will be created implicitly on first ZINCRBY
  console.log(`Leaderboard initialized for room: ${roomCode}`);
};

const addScore = async (roomCode, userId, pointsToAdd) => {
  const redis = getRedis();
  const key = `quiz:leaderboard:${roomCode}`;
  const newScore = await redis.zincrby(key, pointsToAdd, userId);
  return parseFloat(newScore);
};

const getTopPlayers = async (roomCode, count = 10, playerNameMap = {}) => {
  const redis = getRedis();
  const key = `quiz:leaderboard:${roomCode}`;
  // Returns [member, score, member, score, ...]
  const result = await redis.zrevrange(key, 0, count - 1, 'WITHSCORES');

  const players = [];
  for (let i = 0; i < result.length; i += 2) {
    const userId = result[i];
    const score = Math.floor(parseFloat(result[i + 1]));
    const rank = Math.floor(i / 2) + 1;
    players.push({
      userId,
      name: playerNameMap[userId] || userId,
      score,
      rank,
    });
  }

  return players;
};

const getPlayerScore = async (roomCode, userId) => {
  const redis = getRedis();
  const key = `quiz:leaderboard:${roomCode}`;
  const score = await redis.zscore(key, userId);
  return score !== null ? Math.floor(parseFloat(score)) : 0;
};

const getPlayerRank = async (roomCode, userId) => {
  const redis = getRedis();
  const key = `quiz:leaderboard:${roomCode}`;
  const rank = await redis.zrevrank(key, userId);
  if (rank === null) return null;
  return rank + 1; // Redis rank is 0-indexed
};

const calculateAndAddScore = async (roomCode, userId, basePoints, timeLeft, isCorrect) => {
  const redis = getRedis();

  if (!isCorrect) {
    // Reset streak on wrong answer, score remains unchanged
    const streakKey = `quiz:streak:${roomCode}:${userId}`;
    await redis.set(streakKey, 0);
    const totalScore = await getPlayerScore(roomCode, userId);
    return { pointsEarned: 0, totalScore, streak: 0 };
  }

  // Award the manually assigned base points
  // Add a tiny fraction based on time left for tie-breaking.
  // More time left = higher decimal fraction = better rank when points are equal.
  const timeBonus = Math.max(0, timeLeft) / 1000;
  const pointsEarned = basePoints + timeBonus;
  
  const totalScoreRaw = await addScore(roomCode, userId, pointsEarned);
  const totalScore = Math.floor(totalScoreRaw);

  // Increment streak in Redis
  const streakKey = `quiz:streak:${roomCode}:${userId}`;
  const streak = await redis.incr(streakKey);

  return { pointsEarned: Math.floor(pointsEarned), totalScore, streak };
};

const markAnswered = async (roomCode, questionIndex, userId) => {
  const redis = getRedis();
  const key = `quiz:answered:${roomCode}:${questionIndex}`;
  // SADD returns 1 if added, 0 if already exists
  const added = await redis.sadd(key, userId);
  // Set expiry so key doesn't persist forever
  await redis.expire(key, 3600);
  return added === 1; // true if first time answering
};

const hasAnswered = async (roomCode, questionIndex, userId) => {
  const redis = getRedis();
  const key = `quiz:answered:${roomCode}:${questionIndex}`;
  const isMember = await redis.sismember(key, userId);
  return isMember === 1;
};

const incrementTabSwitch = async (roomCode, userId) => {
  const redis = getRedis();
  const key = `quiz:tabswitch:${roomCode}:${userId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 7200);
  return count;
};

const cleanupRoom = async (roomCode) => {
  const redis = getRedis();
  try {
    const keys = await redis.keys(`quiz:*:${roomCode}*`);
    const moreKeys = await redis.keys(`quiz:streak:${roomCode}:*`);
    const answeredKeys = await redis.keys(`quiz:answered:${roomCode}:*`);
    const tabKeys = await redis.keys(`quiz:tabswitch:${roomCode}:*`);

    const allKeys = [
      `quiz:leaderboard:${roomCode}`,
      `quiz:current:${roomCode}`,
      ...moreKeys,
      ...answeredKeys,
      ...tabKeys,
    ].filter((k, i, arr) => arr.indexOf(k) === i); // deduplicate

    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }

    console.log(`Cleaned up ${allKeys.length} Redis keys for room: ${roomCode}`);
  } catch (error) {
    console.error(`Redis cleanup error for room ${roomCode}:`, error.message);
  }
};

export {
  initLeaderboard,
  addScore,
  getTopPlayers,
  getPlayerScore,
  getPlayerRank,
  calculateAndAddScore,
  markAnswered,
  hasAnswered,
  incrementTabSwitch,
  cleanupRoom,
};
