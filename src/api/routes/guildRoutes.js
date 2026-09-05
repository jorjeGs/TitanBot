import { Router } from 'express';
import {
  getUserGuilds,
  getGuildDetails,
  getGuildChannels,
  getGuildRoles,
  getGuildConfigHandler,
  updateGuildConfigHandler,
} from '../controllers/guildController.js';
import { updateGuildCommands } from '../controllers/commandController.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';
import { checkGuildPermissions } from '../middlewares/checkGuildPermissions.js';

const router = Router();

// Guilds list where user has admin/manage rights
router.get('/', verifyAuth, getUserGuilds);

// Specific guild subroutes protected by checkGuildPermissions
router.get('/:guildId', verifyAuth, checkGuildPermissions, getGuildDetails);
router.get('/:guildId/channels', verifyAuth, checkGuildPermissions, getGuildChannels);
router.get('/:guildId/roles', verifyAuth, checkGuildPermissions, getGuildRoles);
router.get('/:guildId/config', verifyAuth, checkGuildPermissions, getGuildConfigHandler);
router.patch('/:guildId/config', verifyAuth, checkGuildPermissions, updateGuildConfigHandler);
router.patch('/:guildId/commands', verifyAuth, checkGuildPermissions, updateGuildCommands);

export default router;
