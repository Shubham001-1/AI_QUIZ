import express from 'express';
const router = express.Router();
import { generateQuiz, getQuiz, getQuizHistory, aiGenerateCells, publishQuiz, aiAssist } from '../controllers/quizController.js';
import authMiddleware from '../middleware/authMiddleware.js';

// POST /api/quiz/generate - Protected (existing quick-generate flow)
router.post('/generate', authMiddleware, generateQuiz);

// ── Builder endpoints ──────────────────────────────────────────────────────────
// POST /api/quiz/ai-cells  - Generate N questions without saving (builder)
router.post('/ai-cells', authMiddleware, aiGenerateCells);

// POST /api/quiz/publish   - Publish a fully edited builder quiz
router.post('/publish', authMiddleware, publishQuiz);

// POST /api/quiz/ai-assist - AI companion free-form chat
router.post('/ai-assist', authMiddleware, aiAssist);

// GET /api/quiz/history/:userId - Protected
router.get('/history/:userId', authMiddleware, getQuizHistory);

// GET /api/quiz/:roomCode - Public (must come last to avoid swallowing named routes)
router.get('/:roomCode', getQuiz);

export default router;
