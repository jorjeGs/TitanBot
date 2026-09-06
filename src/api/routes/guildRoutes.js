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
import {
  getGiveaways,
  createGiveawayHandler,
  endGiveawayHandler,
  rerollGiveawayHandler,
  deleteGiveawayHandler,
} from '../controllers/giveawayController.js';
import {
  getBirthdays,
  updateBirthdayConfig,
  deleteBirthdayRecord,
} from '../controllers/birthdayController.js';
import {
  getApplicationData,
  updateApplicationSettingsHandler,
  reviewApplicationHandler,
  deleteApplicationHandler,
} from '../controllers/applicationController.js';
import {
  sendEmbedHandler,
  sendInteractiveEmbedHandler,
  getEmbedTemplatesHandler,
  saveEmbedTemplateHandler,
  deleteEmbedTemplateHandler,
} from '../controllers/embedController.js';
import {
  getGuildAuditLogsHandler,
  clearGuildAuditLogsHandler,
} from '../controllers/auditLogController.js';
import {
  getMusicStatusHandler,
  executeMusicActionHandler,
} from '../controllers/musicController.js';
import {
  getAutomations,
  createOrUpdateSticky,
  deleteSticky,
  createOrUpdateScheduled,
  deleteScheduled,
  triggerScheduledNow,
  createOrUpdateAutoResponder,
  deleteAutoResponder,
} from '../controllers/automationsController.js';
import {
  getTranscripts,
  getTranscriptDetail,
  downloadTranscriptHtml,
  deleteTranscriptHandler,
} from '../controllers/transcriptsController.js';
import {
  getAntiRaidSettings,
  updateAntiRaidSettings,
  toggleEmergencyLockdownHandler,
} from '../controllers/antiRaidController.js';
import {
  getSnapshots,
  createSnapshotHandler,
  exportSnapshotJson,
  importSnapshotHandler,
  restoreSnapshotHandler,
  deleteSnapshotHandler,
} from '../controllers/snapshotController.js';
import {
  getInsightsOverviewHandler,
  getGrowthHandler,
  getHeatmapHandler,
  getChannelsHandler,
} from '../controllers/insightsController.js';
import {
  getSocialFeeds,
  saveSocialFeed,
  deleteSocialFeed,
  testSocialFeed,
  receiveIncomingWebhook,
} from '../controllers/socialFeedController.js';
import {
  getAiAssistantConfig,
  updateAiAssistantConfig,
  testAiPrompt,
  saveKnowledgeItem,
  deleteKnowledgeItem,
} from '../controllers/aiAssistantController.js';
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

// Giveaway subroutes protected by checkGuildPermissions
router.get('/:guildId/giveaways', verifyAuth, checkGuildPermissions, getGiveaways);
router.post('/:guildId/giveaways', verifyAuth, checkGuildPermissions, createGiveawayHandler);
router.post('/:guildId/giveaways/:messageId/end', verifyAuth, checkGuildPermissions, endGiveawayHandler);
router.post('/:guildId/giveaways/:messageId/reroll', verifyAuth, checkGuildPermissions, rerollGiveawayHandler);
router.delete('/:guildId/giveaways/:messageId', verifyAuth, checkGuildPermissions, deleteGiveawayHandler);

// Birthday subroutes protected by checkGuildPermissions
router.get('/:guildId/birthdays', verifyAuth, checkGuildPermissions, getBirthdays);
router.patch('/:guildId/birthdays/config', verifyAuth, checkGuildPermissions, updateBirthdayConfig);
router.delete('/:guildId/birthdays/:userId', verifyAuth, checkGuildPermissions, deleteBirthdayRecord);

// Application subroutes protected by checkGuildPermissions
router.get('/:guildId/applications', verifyAuth, checkGuildPermissions, getApplicationData);
router.patch('/:guildId/applications/config', verifyAuth, checkGuildPermissions, updateApplicationSettingsHandler);
router.patch('/:guildId/applications/:appId/review', verifyAuth, checkGuildPermissions, reviewApplicationHandler);
router.delete('/:guildId/applications/:appId', verifyAuth, checkGuildPermissions, deleteApplicationHandler);

// Embed builder subroutes protected by checkGuildPermissions
router.post('/:guildId/embeds/send', verifyAuth, checkGuildPermissions, sendEmbedHandler);
router.post('/:guildId/embeds/send-interactive', verifyAuth, checkGuildPermissions, sendInteractiveEmbedHandler);
router.get('/:guildId/embeds/templates', verifyAuth, checkGuildPermissions, getEmbedTemplatesHandler);
router.post('/:guildId/embeds/templates', verifyAuth, checkGuildPermissions, saveEmbedTemplateHandler);
router.delete('/:guildId/embeds/templates/:templateId', verifyAuth, checkGuildPermissions, deleteEmbedTemplateHandler);

// Music player subroutes protected by checkGuildPermissions
router.get('/:guildId/music/status', verifyAuth, checkGuildPermissions, getMusicStatusHandler);
router.post('/:guildId/music/action', verifyAuth, checkGuildPermissions, executeMusicActionHandler);

// Automations subroutes (Sticky, Scheduled, Auto-responders) protected by checkGuildPermissions
router.get('/:guildId/automations', verifyAuth, checkGuildPermissions, getAutomations);
router.post('/:guildId/automations/sticky', verifyAuth, checkGuildPermissions, createOrUpdateSticky);
router.delete('/:guildId/automations/sticky/:id', verifyAuth, checkGuildPermissions, deleteSticky);
router.post('/:guildId/automations/scheduled', verifyAuth, checkGuildPermissions, createOrUpdateScheduled);
router.delete('/:guildId/automations/scheduled/:id', verifyAuth, checkGuildPermissions, deleteScheduled);
router.post('/:guildId/automations/scheduled/:id/trigger', verifyAuth, checkGuildPermissions, triggerScheduledNow);
router.post('/:guildId/automations/auto-responders', verifyAuth, checkGuildPermissions, createOrUpdateAutoResponder);
router.delete('/:guildId/automations/auto-responders/:id', verifyAuth, checkGuildPermissions, deleteAutoResponder);

// Ticket transcripts subroutes
router.get('/:guildId/transcripts', verifyAuth, checkModerationAccess, getTranscripts);
router.get('/:guildId/transcripts/:id', verifyAuth, checkModerationAccess, getTranscriptDetail);
router.get('/:guildId/transcripts/:id/download', verifyAuth, checkModerationAccess, downloadTranscriptHtml);
router.delete('/:guildId/transcripts/:id', verifyAuth, checkGuildPermissions, deleteTranscriptHandler);

// Anti-Raid shield subroutes
router.get('/:guildId/antiraid', verifyAuth, checkModerationAccess, getAntiRaidSettings);
router.patch('/:guildId/antiraid', verifyAuth, checkGuildPermissions, updateAntiRaidSettings);
router.post('/:guildId/antiraid/lockdown/toggle', verifyAuth, checkGuildPermissions, toggleEmergencyLockdownHandler);

// Server snapshots & backups subroutes
router.get('/:guildId/snapshots', verifyAuth, checkGuildPermissions, getSnapshots);
router.post('/:guildId/snapshots', verifyAuth, checkGuildPermissions, createSnapshotHandler);
router.get('/:guildId/snapshots/:id/export', verifyAuth, checkGuildPermissions, exportSnapshotJson);
router.post('/:guildId/snapshots/import', verifyAuth, checkGuildPermissions, importSnapshotHandler);
router.post('/:guildId/snapshots/:id/restore', verifyAuth, checkGuildPermissions, restoreSnapshotHandler);
router.delete('/:guildId/snapshots/:id', verifyAuth, checkGuildPermissions, deleteSnapshotHandler);

// Server insights & analytics subroutes
router.get('/:guildId/insights/overview', verifyAuth, checkModerationAccess, getInsightsOverviewHandler);
router.get('/:guildId/insights/growth', verifyAuth, checkModerationAccess, getGrowthHandler);
router.get('/:guildId/insights/heatmap', verifyAuth, checkModerationAccess, getHeatmapHandler);
router.get('/:guildId/insights/channels', verifyAuth, checkModerationAccess, getChannelsHandler);

// Social Feeds & Webhooks subroutes
router.get('/:guildId/socialfeeds', verifyAuth, checkGuildPermissions, getSocialFeeds);
router.post('/:guildId/socialfeeds', verifyAuth, checkGuildPermissions, saveSocialFeed);
router.delete('/:guildId/socialfeeds/:id', verifyAuth, checkGuildPermissions, deleteSocialFeed);
router.post('/:guildId/socialfeeds/:id/test', verifyAuth, checkGuildPermissions, testSocialFeed);
router.post('/:guildId/socialfeeds/webhooks/incoming/:feedId', receiveIncomingWebhook);
router.post('/webhooks/incoming/:guildId/:feedId', receiveIncomingWebhook);

// AI Assistant subroutes
router.get('/:guildId/aiassistant', verifyAuth, checkGuildPermissions, getAiAssistantConfig);
router.patch('/:guildId/aiassistant', verifyAuth, checkGuildPermissions, updateAiAssistantConfig);
router.post('/:guildId/aiassistant/test', verifyAuth, checkGuildPermissions, testAiPrompt);
router.post('/:guildId/aiassistant/knowledge', verifyAuth, checkGuildPermissions, saveKnowledgeItem);
router.delete('/:guildId/aiassistant/knowledge/:id', verifyAuth, checkGuildPermissions, deleteKnowledgeItem);

// Dashboard Audit Logs subroutes
router.get('/:guildId/audit-logs', verifyAuth, checkModerationAccess, getGuildAuditLogsHandler);
router.delete('/:guildId/audit-logs', verifyAuth, checkGuildPermissions, clearGuildAuditLogsHandler);

export default router;

