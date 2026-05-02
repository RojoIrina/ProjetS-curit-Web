// ================================================================
// AUTH ROUTES — Login, refresh, logout, profile
// Refresh token is now read from HttpOnly cookie (not body)
// ================================================================
import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.guard.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rate.limiter.js';

const router = Router();

// Zod schemas for input validation
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

// POST /api/auth/login — rate limited (10/15min)
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);

// POST /api/auth/refresh — rate limited, reads cookie (no body needed)
router.post('/refresh', authLimiter, authController.refresh);

// POST /api/auth/logout — requires auth
router.post('/logout', requireAuth, authController.logout);

// GET /api/auth/profile — requires auth
router.get('/profile', requireAuth, authController.getProfile);

export default router;

