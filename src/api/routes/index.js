import { Router } from 'express';
import authRoutes from './authRoutes.js';
import guildRoutes from './guildRoutes.js';
import commandRoutes from './commandRoutes.js';
import { getPublicTranscript } from '../controllers/transcriptsController.js';
import { apiRateLimiter } from '../middlewares/rateLimiter.js';

/**
 * Creates and configures the master API router with Discord client dependency.
 * @param {object} client - The Discord client instance.
 * @returns {Router} Express router.
 */
export function createApiRouter(client) {
  const router = Router();

  // Attach Discord client to all API requests
  router.use((req, res, next) => {
    req.client = client;
    next();
  });

  router.use('/auth', authRoutes);
  router.use('/guilds', guildRoutes);
  router.use('/commands', commandRoutes);
  router.get('/transcripts/:id', apiRateLimiter, getPublicTranscript);

  return router;
}

export default createApiRouter;
