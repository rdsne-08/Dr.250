import { Router } from 'express';

import { login, logout, me, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validateLogin, validateRegistration } from '../validators/auth.validator.js';

export const authRouter = Router();

authRouter.post('/register', validateRegistration, rateLimit('register'), register);
authRouter.post('/login', validateLogin, rateLimit('login'), login);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, me);
