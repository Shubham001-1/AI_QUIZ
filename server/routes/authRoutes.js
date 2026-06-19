import express from 'express';
const router = express.Router();
import { register, login } from '../controllers/authController.js';

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

export default router;
