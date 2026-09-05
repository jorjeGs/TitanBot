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
import {
  getEconomySettings,
  updateEconomySettings,
} from '../controllers/economyController.js';
import {
  getServerstatsSettings,
  setupCounters,
  deleteCounters,
} from '../controllers/serverstatsController.js';
import {
  getJoinToCreateSettings,
  updateJoinToCreateSettings,
} from '../controllers/jointocreateController.js';
import {
  getGuildCases,
  getUserModHistory,
  deleteWarning,
  clearUserWarnings,
  getModerationSettings,
  updateModerationSettings,
} from '../controllers/moderationController.js';
import { verifyAuth } from '../middlewares/verifyAuth.js';
import { checkGuildPermissions } from '../middlewares/checkGuildPermissions.js';
import { checkModerationAccess } from '../middlewares/checkModerationAccess.js';

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
router.get('/:guildId/economy', verifyAuth, checkGuildPermissions, getEconomySettings);
router.patch('/:guildId/economy', verifyAuth, checkGuildPermissions, updateEconomySettings);
router.get('/:guildId/serverstats', verifyAuth, checkGuildPermissions, getServerstatsSettings);
router.post('/:guildId/serverstats/setup', verifyAuth, checkGuildPermissions, setupCounters);
router.delete('/:guildId/serverstats', verifyAuth, checkGuildPermissions, deleteCounters);
router.get('/:guildId/jointocreate', verifyAuth, checkGuildPermissions, getJoinToCreateSettings);
router.patch('/:guildId/jointocreate', verifyAuth, checkGuildPermissions, updateJoinToCreateSettings);

// Moderation subroutes protected by checkModerationAccess
router.get('/:guildId/moderation/cases', verifyAuth, checkModerationAccess, getGuildCases);
router.get('/:guildId/moderation/users/:userId', verifyAuth, checkModerationAccess, getUserModHistory);
router.delete('/:guildId/moderation/warnings/:userId/:warningId', verifyAuth, checkModerationAccess, deleteWarning);
router.delete('/:guildId/moderation/warnings/:userId', verifyAuth, checkModerationAccess, clearUserWarnings);
router.get('/:guildId/moderation/config', verifyAuth, checkModerationAccess, getModerationSettings);
router.patch('/:guildId/moderation/config', verifyAuth, checkModerationAccess, updateModerationSettings);

export default router;

