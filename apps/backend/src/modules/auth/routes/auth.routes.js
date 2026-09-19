import { Router } from 'express';

import { login, logout, me, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateLogin, validateRegistration } from '../validators/auth.validator.js';

export const authRouter = Router();

authRouter.post('/register', validateRegistration, register);
authRouter.post('/login', validateLogin, login);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, me);
