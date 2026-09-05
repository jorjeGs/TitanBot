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
import {
  getGuildReactionRoles,
  createGuildReactionRole,
  deleteGuildReactionRole,
} from '../controllers/reactRoleController.js';
import { publishVerificationPanel } from '../controllers/verificationController.js';
import {
  getTicketSettings,
  publishTicketPanel,
  deleteTicketPanel,
} from '../controllers/ticketController.js';
import {
  getLevelingSettings,
  updateLevelingSettings,
} from '../controllers/levelingController.js';
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
router.get('/:guildId/reactroles', verifyAuth, checkGuildPermissions, getGuildReactionRoles);
router.post('/:guildId/reactroles', verifyAuth, checkGuildPermissions, createGuildReactionRole);
router.delete('/:guildId/reactroles/:messageId', verifyAuth, checkGuildPermissions, deleteGuildReactionRole);
router.post('/:guildId/verification/publish', verifyAuth, checkGuildPermissions, publishVerificationPanel);
router.get('/:guildId/tickets', verifyAuth, checkGuildPermissions, getTicketSettings);
router.post('/:guildId/tickets/publish', verifyAuth, checkGuildPermissions, publishTicketPanel);
router.delete('/:guildId/tickets/panel', verifyAuth, checkGuildPermissions, deleteTicketPanel);
router.get('/:guildId/leveling', verifyAuth, checkGuildPermissions, getLevelingSettings);
router.patch('/:guildId/leveling', verifyAuth, checkGuildPermissions, updateLevelingSettings);

export default router;
