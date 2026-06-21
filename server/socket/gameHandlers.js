import Quiz from '../models/Quiz.js';
import * as redisService from '../services/redisService.js';

// In-memory room state (supplement to Redis)
// roomState[roomCode] = { host: socketId, players: Map<userId, {nickname, socketId}>, questionStartTime, currentQuestionIndex, timer, leaderboardInterval, answeredThisRound: Set, questions: [] }
const roomState = {};

const gameHandlers = (io, socket) => {
  // HOST_JOIN_ROOM
  socket.on('HOST_JOIN_ROOM', async ({ roomCode, userId, userName }) => {
    try {
      const quiz = await Quiz.findOne({ roomCode: roomCode.toUpperCase() });
      if (!quiz) {
        socket.emit('ERROR', { message: 'Room not found' });
        return;
      }

      socket.join(roomCode);

      const isNewRoom = !roomState[roomCode];

      if (isNewRoom) {
        roomState[roomCode] = {
          host: socket.id,
          hostUserId: userId,
          hostName: userName,
          players: new Map(),
          currentQuestionIndex: -1,
          questionStartTime: null,
          timer: null,
          leaderboardInterval: null,
          questions: quiz.questions,
          quizId: quiz._id,
          status: 'lobby',
          stats: quiz.questions.map(q => ({
            questionText: q.questionText,
            options: q.options,
            counts: [0, 0, 0, 0],
            totalAnswers: 0,
          })),
        };
        await redisService.initLeaderboard(roomCode);
        console.log(`Host ${userName} created room ${roomCode}`);
      } else {
        roomState[roomCode].host = socket.id;
        roomState[roomCode].hostUserId = userId;
        console.log(`Host ${userName} reconnected to room ${roomCode}`);
      }

      const players = Array.from(roomState[roomCode].players.values()).map((p) => ({
        userId: p.userId,
        nickname: p.nickname,
      }));

      const currentQuestionIdx = roomState[roomCode].currentQuestionIndex;
      const completedStats = roomState[roomCode].stats ? roomState[roomCode].stats.slice(0, currentQuestionIdx) : [];

      socket.emit('ROOM_JOINED', { roomCode, players, allStats: completedStats });
    } catch (error) {
      console.error('HOST_JOIN_ROOM error:', error.message);
      socket.emit('ERROR', { message: 'Failed to join room' });
    }
  });

  // PLAYER_JOIN_ROOM
  socket.on('PLAYER_JOIN_ROOM', async ({ roomCode, nickname }) => {
    try {
      const quiz = await Quiz.findOne({ roomCode: roomCode.toUpperCase() });
      if (!quiz) {
        socket.emit('ERROR', { message: 'Room not found. Check your room code.' });
        return;
      }

      if (quiz.status === 'finished') {
        socket.emit('ERROR', { message: 'This game has already ended.' });
        return;
      }

      if (quiz.status === 'active') {
        socket.emit('ERROR', { message: 'Game already in progress. Please wait for the next game.' });
        return;
      }

      socket.join(roomCode);

      if (!roomState[roomCode]) {
        roomState[roomCode] = {
          host: null,
          hostUserId: null,
          hostName: null,
          players: new Map(),
          currentQuestionIndex: -1,
          questionStartTime: null,
          timer: null,
          leaderboardInterval: null,
          questions: quiz.questions,
          quizId: quiz._id,
          status: 'lobby',
          stats: quiz.questions.map(q => ({
            questionText: q.questionText,
            options: q.options,
            counts: [0, 0, 0, 0],
            totalAnswers: 0,
          })),
        };
      }

      const userId = socket.id; // Use socket ID as player identifier for guests
      roomState[roomCode].players.set(userId, {
        userId,
        nickname,
        socketId: socket.id,
        score: 0,
      });

      // Register player in Redis leaderboard with score 0
      await redisService.addScore(roomCode, userId, 0);

      const players = Array.from(roomState[roomCode].players.values()).map((p) => ({
        userId: p.userId,
        nickname: p.nickname,
      }));

      socket.emit('ROOM_JOINED', { roomCode, players, userId });
      io.to(roomCode).emit('PLAYER_JOINED', { players });

      console.log(`Player ${nickname} (${userId}) joined room ${roomCode}`);
    } catch (error) {
      console.error('PLAYER_JOIN_ROOM error:', error.message);
      socket.emit('ERROR', { message: 'Failed to join room' });
    }
  });

  // START_GAME
  socket.on('START_GAME', async ({ roomCode }) => {
    try {
      const room = roomState[roomCode];
      if (!room) {
        socket.emit('ERROR', { message: 'Room not found' });
        return;
      }

      if (room.host !== socket.id) {
        socket.emit('ERROR', { message: 'Only the host can start the game' });
        return;
      }

      if (room.players.size === 0) {
        socket.emit('ERROR', { message: 'Need at least one player to start' });
        return;
      }

      // Update quiz status in DB
      await Quiz.findOneAndUpdate({ roomCode }, { status: 'active' });
      room.status = 'active';
      room.currentQuestionIndex = -1;

      io.to(roomCode).emit('GAME_STARTED');

      // Start leaderboard broadcast interval
      room.leaderboardInterval = setInterval(async () => {
        try {
          const nameMap = buildNameMap(room);
          const leaderboard = await redisService.getTopPlayers(roomCode, 10, nameMap);
          io.to(roomCode).emit('LEADERBOARD_UPDATE', { leaderboard });
        } catch (err) {
          console.error('Leaderboard interval error:', err.message);
        }
      }, 2000);

      // Send first question
      sendNextQuestion(io, roomCode);
    } catch (error) {
      console.error('START_GAME error:', error.message);
      socket.emit('ERROR', { message: 'Failed to start game' });
    }
  });

  // SUBMIT_ANSWER
  socket.on('SUBMIT_ANSWER', async ({ roomCode, userId, selectedOption, timeLeft }) => {
    try {
      const room = roomState[roomCode];
      if (!room || room.status !== 'active') return;

      const questionIndex = room.currentQuestionIndex;
      if (questionIndex < 0 || questionIndex >= room.questions.length) return;

      // Anti-cheat: Check if already answered
      const alreadyAnswered = await redisService.hasAnswered(roomCode, questionIndex, userId);
      if (alreadyAnswered) {
        socket.emit('ERROR', { message: 'You have already answered this question.' });
        return;
      }

      // Anti-cheat: Time validation
      if (room.questionStartTime) {
        const elapsed = (Date.now() - room.questionStartTime) / 1000;
        const serverTimeLeft = 20 - elapsed;
        // If client claims more time left than server allows (with 2s tolerance), reject
        if (timeLeft > serverTimeLeft + 2) {
          socket.emit('ERROR', { message: 'Invalid answer timing.' });
          return;
        }
      }

      // Mark as answered (anti-cheat)
      await redisService.markAnswered(roomCode, questionIndex, userId);

      // Track statistics
      if (room.stats && room.stats[questionIndex] && typeof selectedOption === 'number' && selectedOption >= 0 && selectedOption < 4) {
        room.stats[questionIndex].counts[selectedOption] += 1;
        room.stats[questionIndex].totalAnswers += 1;
      }

      const question = room.questions[questionIndex];
      const isCorrect = selectedOption === question.correctOptionIndex;
      const safeTimeLeft = Math.max(0, Math.min(timeLeft, 20));

      const { pointsEarned, totalScore } = await redisService.calculateAndAddScore(
        roomCode,
        userId,
        question.points || 100,
        safeTimeLeft,
        isCorrect
      );

      // Update player score in memory
      if (room.players.has(userId)) {
        room.players.get(userId).score = totalScore;
      }

      socket.emit('ANSWER_RESULT', {
        correct: isCorrect,
        pointsEarned,
        totalScore,
        correctOptionIndex: question.correctOptionIndex,
      });
    } catch (error) {
      console.error('SUBMIT_ANSWER error:', error.message);
      socket.emit('ERROR', { message: 'Failed to process answer' });
    }
  });

  // NEXT_QUESTION (host only)
  socket.on('NEXT_QUESTION', ({ roomCode }) => {
    try {
      const room = roomState[roomCode];
      if (!room || room.host !== socket.id) return;

      sendNextQuestion(io, roomCode);
    } catch (error) {
      console.error('NEXT_QUESTION error:', error.message);
    }
  });

  // END_GAME (host only)
  socket.on('END_GAME', async ({ roomCode }) => {
    try {
      const room = roomState[roomCode];
      if (!room) return;
      if (room.host !== socket.id) {
        socket.emit('ERROR', { message: 'Only the host can end the game' });
        return;
      }
      await endGame(io, roomCode);
    } catch (error) {
      console.error('END_GAME error:', error.message);
    }
  });

  // TAB_SWITCH_DETECTED (anti-cheat)
  socket.on('TAB_SWITCH_DETECTED', async ({ userId, roomCode }) => {
    try {
      const count = await redisService.incrementTabSwitch(roomCode, userId);
      console.log(`Tab switch detected for ${userId} in room ${roomCode}. Count: ${count}`);

      if (count >= 3) {
        // Third and subsequent offenses: deduct 5 points
        await redisService.addScore(roomCode, userId, -5);
        const room = roomState[roomCode];
        if (room && room.players.has(userId)) {
          const player = room.players.get(userId);
          const newScore = await redisService.getPlayerScore(roomCode, userId);
          player.score = newScore;

          // Notify the player
          socket.emit('TAB_SWITCH_PENALTY', {
            message: `Tab switching detected! -5 points deducted (Attempt ${count}).`,
            deduction: 5,
            totalScore: Math.max(0, newScore),
          });
        }
      } else if (count === 2) {
        socket.emit('TAB_SWITCH_WARNING', {
          message: 'Warning (2/2): Tab switching detected! Further tab switches will result in -5 points deduction.',
        });
      } else {
        socket.emit('TAB_SWITCH_WARNING', {
          message: 'Warning (1/2): Tab switching detected! Please stay on the page to avoid point deduction.',
        });
      }
    } catch (error) {
      console.error('TAB_SWITCH_DETECTED error:', error.message);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      // Find which rooms this socket was in
      for (const [roomCode, room] of Object.entries(roomState)) {
        // Check if disconnected socket is the host
        if (room.host === socket.id) {
          console.log(`Host disconnected from room ${roomCode}`);
          io.to(roomCode).emit('HOST_DISCONNECTED', {
            message: 'The host has disconnected. The game may end shortly.',
          });
          room.host = null;

          // If game was active, end it after a timeout
          setTimeout(async () => {
            if (roomState[roomCode] && !roomState[roomCode].host) {
              await endGame(io, roomCode);
            }
          }, 30000); // 30 second grace period
        }

        // Check if it's a player
        for (const [userId, player] of room.players.entries()) {
          if (player.socketId === socket.id) {
            room.players.delete(userId);
            const players = Array.from(room.players.values()).map((p) => ({
              userId: p.userId,
              nickname: p.nickname,
            }));
            io.to(roomCode).emit('PLAYER_JOINED', { players }); // reuse event to update list
            console.log(`Player ${player.nickname} disconnected from room ${roomCode}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Disconnect handler error:', error.message);
    }
  });
};

// Helper: Build name map from room players
const buildNameMap = (room) => {
  const map = {};
  for (const [userId, player] of room.players.entries()) {
    map[userId] = player.nickname;
  }
  return map;
};

// Helper: Send next question
const sendNextQuestion = (io, roomCode) => {
  const room = roomState[roomCode];
  if (!room) return;

  // Clear existing timer
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  room.currentQuestionIndex += 1;

  if (room.currentQuestionIndex >= room.questions.length) {
    endGame(io, roomCode);
    return;
  }

  const question = room.questions[room.currentQuestionIndex];
  room.questionStartTime = Date.now();
  room.answeredThisRound = new Set();

  const safeQuestion = {
    questionText: question.questionText,
    options: question.options,
    points: question.points,
  };

  io.to(roomCode).emit('NEW_QUESTION', {
    question: safeQuestion,
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    timeLimit: 20,
  });

  // 20-second timer
  room.timer = setTimeout(async () => {
    try {
      io.to(roomCode).emit('TIME_UP', {
        correctOptionIndex: question.correctOptionIndex,
        questionIndex: room.currentQuestionIndex,
        stats: room.stats[room.currentQuestionIndex],
        allStats: room.stats.slice(0, room.currentQuestionIndex + 1),
      });

      // Automatically advance to the next question or end game after 8 seconds of show time
      room.timer = setTimeout(() => {
        sendNextQuestion(io, roomCode);
      }, 8000);
    } catch (err) {
      console.error('TIME_UP emit error:', err.message);
    }
  }, 20000);
};

// Helper: End game
const endGame = async (io, roomCode) => {
  const room = roomState[roomCode];
  if (!room) return;

  // Clear timers
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  if (room.leaderboardInterval) {
    clearInterval(room.leaderboardInterval);
    room.leaderboardInterval = null;
  }

  try {
    const nameMap = buildNameMap(room);
    const finalLeaderboard = await redisService.getTopPlayers(roomCode, 50, nameMap);

    // Save to MongoDB
    await Quiz.findOneAndUpdate(
      { roomCode },
      {
        status: 'finished',
        finalLeaderboard: finalLeaderboard.map((p) => ({
          userId: p.userId,
          name: p.name,
          score: p.score,
          rank: p.rank,
        })),
      }
    );

    io.to(roomCode).emit('GAME_OVER', { finalLeaderboard });

    // Cleanup Redis
    await redisService.cleanupRoom(roomCode);

    // Cleanup room state after a delay
    setTimeout(() => {
      delete roomState[roomCode];
    }, 60000);
  } catch (error) {
    console.error('End game error:', error.message);
  }
};

export default gameHandlers;
