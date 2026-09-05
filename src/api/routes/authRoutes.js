import { Router } from 'express';
import { login, callback, getMe, logout } from '../controllers/authController.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.get('/login', authRateLimiter, login);
router.get('/callback', authRateLimiter, callback);
router.get('/me', verifyAuth, getMe);
router.post('/logout', verifyAuth, logout);

export default router;
