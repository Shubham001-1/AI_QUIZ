import express from 'express';
const router = express.Router();
import { generateQuiz, getQuiz, getQuizHistory } from '../controllers/quizController.js';
import authMiddleware from '../middleware/authMiddleware.js';

// POST /api/quiz/generate - Protected
router.post('/generate', authMiddleware, generateQuiz);

// GET /api/quiz/history/:userId - Protected
router.get('/history/:userId', authMiddleware, getQuizHistory);

// GET /api/quiz/:roomCode - Public
router.get('/:roomCode', getQuiz);

export default router;
