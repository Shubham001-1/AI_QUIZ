const express = require('express');
const router = express.Router();
const { generateQuiz, getQuiz, getQuizHistory } = require('../controllers/quizController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/quiz/generate - Protected
router.post('/generate', authMiddleware, generateQuiz);

// GET /api/quiz/history/:userId - Protected
router.get('/history/:userId', authMiddleware, getQuizHistory);

// GET /api/quiz/:roomCode - Public
router.get('/:roomCode', getQuiz);

module.exports = router;
