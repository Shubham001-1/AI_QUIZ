import Quiz from '../models/Quiz.js';
import { generateQuestions, generateQuestionsN, aiAssistChat } from '../services/geminiService.js';

const generateRoomCode = () => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

const generateUniqueRoomCode = async () => {
  let code;
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    code = generateRoomCode();
    const existing = await Quiz.findOne({ roomCode: code });
    exists = !!existing;
    attempts++;
  }
  if (exists) {
    throw new Error('Failed to generate unique room code. Please try again.');
  }
  return code;
};

const generateQuiz = async (req, res) => {
  try {
    let { topic, difficulty } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required and must be a non-empty string.',
      });
    }

    if (topic.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Topic must be under 200 characters.',
      });
    }

    // Validate difficulty
    if (!difficulty || typeof difficulty !== 'string') {
      difficulty = 'medium';
    }
    difficulty = difficulty.toLowerCase().trim();
    if (difficulty !== 'medium' && difficulty !== 'hard') {
      difficulty = 'medium';
    }

    const questions = await generateQuestions(topic.trim(), difficulty);
    const roomCode = await generateUniqueRoomCode();

    const quiz = new Quiz({
      topic: topic.trim(),
      roomCode,
      hostId: req.user.userId,
      status: 'lobby',
      questions,
    });

    await quiz.save();

    return res.status(201).json({
      success: true,
      message: 'Quiz generated successfully.',
      roomCode,
      quizId: quiz._id,
      questions,
    });
  } catch (error) {
    console.error('Generate quiz error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate quiz. Please try again.',
    });
  }
};

const getQuiz = async (req, res) => {
  try {
    const { roomCode } = req.params;

    if (!roomCode) {
      return res.status(400).json({
        success: false,
        message: 'Room code is required.',
      });
    }

    const quiz = await Quiz.findOne({ roomCode: roomCode.toUpperCase() })
      .populate('hostId', 'name email')
      .lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found. Check the room code and try again.',
      });
    }

    // Strip correct answers for security - only expose when game is finished
    const safeQuestions = quiz.questions.map((q) => ({
      questionText: q.questionText,
      options: q.options,
      points: q.points,
      // correctOptionIndex only revealed when game is finished
      ...(quiz.status === 'finished' && { correctOptionIndex: q.correctOptionIndex }),
    }));

    return res.status(200).json({
      success: true,
      quiz: {
        ...quiz,
        questions: safeQuestions,
      },
    });
  } catch (error) {
    console.error('Get quiz error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quiz.',
    });
  }
};

const getQuizHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own quiz history.',
      });
    }

    const quizzes = await Quiz.find({ hostId: userId })
      .sort({ createdAt: -1 })
      .select('topic roomCode status createdAt finalLeaderboard questions')
      .lean();

    return res.status(200).json({
      success: true,
      quizzes: quizzes.map((q) => ({
        ...q,
        questionCount: q.questions ? q.questions.length : 0,
        questions: undefined,
      })),
    });
  } catch (error) {
    console.error('Get quiz history error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quiz history.',
    });
  }
};

// ── Builder: generate N cells without saving ─────────────────────────────────
const aiGenerateCells = async (req, res) => {
  try {
    let { topic, difficulty, count } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Topic is required.' });
    }
    if (topic.trim().length > 200) {
      return res.status(400).json({ success: false, message: 'Topic must be under 200 characters.' });
    }

    difficulty = ['medium', 'hard'].includes((difficulty || '').toLowerCase().trim())
      ? difficulty.toLowerCase().trim()
      : 'medium';

    const safeCount = Math.max(1, Math.min(20, parseInt(count) || 5));
    const questions = await generateQuestionsN(topic.trim(), difficulty, safeCount);

    return res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error('aiGenerateCells error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate questions.' });
  }
};

// ── Builder: publish a fully edited quiz ──────────────────────────────────────
const publishQuiz = async (req, res) => {
  try {
    const { topic, questions } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Topic is required.' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one question is required.' });
    }
    if (questions.length > 50) {
      return res.status(400).json({ success: false, message: 'Maximum 50 questions allowed.' });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.trim().length === 0) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} is missing question text.` });
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must have exactly 4 options.` });
      }
      if (q.options.some((o) => typeof o !== 'string' || o.trim().length === 0)) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} has empty options.` });
      }
      if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} has an invalid correct answer.` });
      }
    }

    const roomCode = await generateUniqueRoomCode();

    const normalised = questions.map((q) => ({
      questionText: q.questionText.trim(),
      options: q.options.map((o) => o.trim()),
      correctOptionIndex: q.correctOptionIndex,
      points: Math.max(10, Math.min(1000, parseInt(q.points) || 100)),
    }));

    const quiz = new Quiz({
      topic: topic.trim(),
      roomCode,
      hostId: req.user.userId,
      status: 'lobby',
      questions: normalised,
    });

    await quiz.save();

    return res.status(201).json({
      success: true,
      message: 'Quiz published successfully.',
      roomCode,
      quizId: quiz._id,
      questionCount: normalised.length,
    });
  } catch (error) {
    console.error('publishQuiz error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to publish quiz.' });
  }
};

// ── Builder: AI companion free-form chat ──────────────────────────────────────
const aiAssist = async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Prompt is required.' });
    }
    if (prompt.trim().length > 1000) {
      return res.status(400).json({ success: false, message: 'Prompt must be under 1000 characters.' });
    }

    const reply = await aiAssistChat(prompt.trim(), context || '');
    return res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error('aiAssist error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'AI assistant failed.' });
  }
};

export { generateQuiz, getQuiz, getQuizHistory, aiGenerateCells, publishQuiz, aiAssist };
