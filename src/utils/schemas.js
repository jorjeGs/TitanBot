// schemas.js

import { z } from 'zod';
import { createError, ErrorTypes } from './errorHandler.js';

export const LogIgnoreSchema = z
  .object({
    users: z.array(z.string()).default([]),
    channels: z.array(z.string()).default([])
  })
  .default({ users: [], channels: [] });

export const LoggingChannelsSchema = z
  .object({
    audit: z.string().nullable().optional(),
    applications: z.string().nullable().optional(),
    reports: z.string().nullable().optional(),
  })
  .default({ audit: null, applications: null, reports: null });

export const LoggingConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    channels: LoggingChannelsSchema.optional(),
    ignore: LogIgnoreSchema.optional(),
    enabledEvents: z.record(z.boolean()).default({}),
    // legacy flat fields — accepted on parse, stripped on normalize
    channelId: z.string().nullable().optional(),
  })
  .default({ enabled: false, enabledEvents: {} });

const TicketLoggingSchema = z
  .object({
    lifecycleChannelId: z.string().nullable().optional(),
    transcriptChannelId: z.string().nullable().optional()
  })
  .optional();

const AutoVerifyConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    criteria: z.enum(['account_age', 'server_size', 'none']).default('none'),
    accountAgeDays: z.number().int().min(1).max(365).nullable().optional(),
    roleId: z.string().nullable().optional()
  })
  .optional();

const VerificationConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    channelId: z.string().nullable().optional(),
    messageId: z.string().nullable().optional(),
    roleId: z.string().nullable().optional(),
    unverifiedRoleId: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    buttonText: z.string().default('Verify').optional(),
    autoVerify: AutoVerifyConfigSchema
  })
  .optional();

export const LevelingConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    xpPerMessage: z
      .object({
        min: z.number().int().min(1).max(500).default(15),
        max: z.number().int().min(1).max(500).default(25),
      })
      .default({ min: 15, max: 25 }),
    xpCooldown: z.number().int().min(0).max(3600).default(60),
    levelUpMessage: z
      .string()
      .max(2000)
      .default('{user} has leveled up to level {level}!'),
    levelUpChannel: z.string().nullable().optional(),
    ignoredChannels: z.array(z.string()).default([]),
    ignoredRoles: z.array(z.string()).default([]),
    roleRewards: z.record(z.string()).default({}),
    announceLevelUp: z.boolean().default(true),
    xpMultiplier: z.number().min(0.1).max(10).default(1),
  })
  .optional();

export const EconomyConfigSchema = z
  .object({
    currencyName: z.string().min(1).max(32).default('coins'),
    currencySymbol: z.string().min(1).max(10).default('🪙'),
    startingBalance: z.number().int().min(0).max(1000000).default(100),
    dailyAmount: z.number().int().min(1).max(1000000).default(1000),
    workMin: z.number().int().min(1).max(100000).default(50),
    workMax: z.number().int().min(1).max(100000).default(250),
    premiumRoleId: z.string().nullable().optional(),
  })
  .optional();

export const JoinToCreateConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    triggerChannels: z.array(z.string()).default([]),
    categoryId: z.string().nullable().optional(),
    channelNameTemplate: z.string().min(1).max(100).default("{username}'s Room"),
    userLimit: z.number().int().min(0).max(99).default(0),
    bitrate: z.number().int().min(8000).max(384000).default(64000),
    temporaryChannels: z.record(z.any()).default({}),
  })
  .optional();

export const AutoPunishRuleSchema = z
  .object({
    warnThreshold: z.number().int().min(1).max(50),
    action: z.enum(['timeout', 'kick', 'ban']),
    durationMinutes: z.number().int().min(1).max(40320).optional().nullable(),
  });

export const ModerationConfigSchema = z
  .object({
    autoPunish: z.array(AutoPunishRuleSchema).default([]),
    dmOnWarn: z.boolean().default(true),
  })
  .default({ autoPunish: [], dmOnWarn: true });

export const CreateGiveawaySchema = z.object({
  channelId: z.string().regex(/^\d{17,19}$/, 'Invalid channel ID'),
  prize: z.string().trim().min(1, 'Prize is required').max(256, 'Prize is too long'),
  durationMinutes: z.number().int().min(1, 'Minimum duration is 1 minute').max(43200, 'Maximum duration is 30 days'),
  winnerCount: z.number().int().min(1, 'Minimum 1 winner').max(10, 'Maximum 10 winners').default(1),
  requiredRoleId: z.string().regex(/^\d{17,19}$/, 'Invalid role ID').nullable().optional(),
});

export const UpdateBirthdayConfigSchema = z.object({
  birthdayChannelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel ID').nullable().optional(),
  birthdayRoleId: z.string().regex(/^\d{17,20}$/, 'Invalid role ID').nullable().optional(),
  birthdayMessage: z.string().max(1000, 'Birthday message is too long').nullable().optional(),
});

export const UpdateApplicationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  applicationChannelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel ID').nullable().optional(),
  logChannelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel ID').nullable().optional(),
  targetRoleId: z.string().regex(/^\d{17,20}$/, 'Invalid role ID').nullable().optional(),
  questions: z
    .array(z.string().trim().min(1, 'Question cannot be empty').max(200, 'Question too long'))
    .min(1, 'At least one question is required')
    .max(10, 'Maximum 10 questions allowed')
    .optional(),
  cooldownHours: z.number().int().min(0).max(720).default(24).optional(),
});

export const ReviewApplicationSchema = z.object({
  action: z.enum(['approve', 'deny']),
  reason: z.string().trim().max(500).nullable().optional(),
});

export const EmbedFieldSchema = z.object({
  name: z.string().trim().min(1, 'Field name cannot be empty').max(256, 'Field name too long (max 256)'),
  value: z.string().trim().min(1, 'Field value cannot be empty').max(1024, 'Field value too long (max 1024)'),
  inline: z.boolean().optional().default(false),
});

export const EmbedAuthorSchema = z.object({
  name: z.string().trim().min(1, 'Author name cannot be empty').max(256, 'Author name too long (max 256)'),
  iconUrl: z.string().url('Invalid author icon URL').nullable().optional().or(z.literal('')),
  url: z.string().url('Invalid author URL').nullable().optional().or(z.literal('')),
});

export const EmbedFooterSchema = z.object({
  text: z.string().trim().min(1, 'Footer text cannot be empty').max(2048, 'Footer text too long (max 2048)'),
  iconUrl: z.string().url('Invalid footer icon URL').nullable().optional().or(z.literal('')),
});

export const SendEmbedSchema = z
  .object({
    channelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel ID'),
    title: z.string().trim().max(256, 'Title too long (max 256)').nullable().optional(),
    description: z.string().trim().max(4096, 'Description too long (max 4096)').nullable().optional(),
    color: z.string().nullable().optional(),
    author: EmbedAuthorSchema.nullable().optional(),
    footer: EmbedFooterSchema.nullable().optional(),
    thumbnail: z.string().url('Invalid thumbnail URL').nullable().optional().or(z.literal('')),
    image: z.string().url('Invalid image URL').nullable().optional().or(z.literal('')),
    timestamp: z.boolean().optional().default(false),
    fields: z.array(EmbedFieldSchema).max(25, 'Maximum 25 fields allowed').optional().default([]),
  })
  .refine(
    (data) =>
      Boolean(
        (data.title && data.title.length > 0) ||
        (data.description && data.description.length > 0) ||
        (Array.isArray(data.fields) && data.fields.length > 0) ||
        (data.author && data.author.name && data.author.name.length > 0) ||
        (data.image && data.image.length > 0) ||
        (data.thumbnail && data.thumbnail.length > 0)
      ),
    {
      message: 'Embed must contain at least a title, description, field, author, image, or thumbnail.',
    }
  );

export const SaveEmbedTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name cannot be empty').max(100, 'Template name too long (max 100)'),
  embed: z
    .object({
      title: z.string().trim().max(256).nullable().optional(),
      description: z.string().trim().max(4096).nullable().optional(),
      color: z.string().nullable().optional(),
      author: EmbedAuthorSchema.nullable().optional(),
      footer: EmbedFooterSchema.nullable().optional(),
      thumbnail: z.string().url().nullable().optional().or(z.literal('')),
      image: z.string().url().nullable().optional().or(z.literal('')),
      timestamp: z.boolean().optional().default(false),
      fields: z.array(EmbedFieldSchema).max(25).optional().default([]),
    })
    .refine(
      (data) =>
        Boolean(
          (data.title && data.title.length > 0) ||
          (data.description && data.description.length > 0) ||
          (Array.isArray(data.fields) && data.fields.length > 0) ||
          (data.author && data.author.name && data.author.name.length > 0) ||
          (data.image && data.image.length > 0) ||
          (data.thumbnail && data.thumbnail.length > 0)
        ),
      {
        message: 'Embed must contain at least a title, description, field, author, image, or thumbnail.',
      }
    ),
});

export const MusicActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'skip', 'stop', 'volume', 'shuffle', 'loop']),
  value: z.union([z.number(), z.string()]).optional(),
});

export const AutomationEmbedSchema = z.object({
  title: z.string().trim().max(256).optional().default(''),
  description: z.string().trim().max(4096).optional().default(''),
  color: z.string().optional().default('#5865F2'),
  footer: z.string().trim().max(2048).optional().default(''),
  image: z.string().url().nullable().optional().or(z.literal('')).default(''),
  thumbnail: z.string().url().nullable().optional().or(z.literal('')).default(''),
});

export const StickyMessageSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel ID'),
  enabled: z.boolean().default(true),
  type: z.enum(['text', 'embed']).default('text'),
  content: z.string().max(2000).optional().default(''),
  embed: AutomationEmbedSchema.optional().default({}),
  messageCountThreshold: z.number().int().min(1).max(100).default(3),
  cooldownSeconds: z.number().int().min(0).max(300).default(5),
  lastMessageId: z.string().regex(/^\d{17,20}$/).nullable().optional().default(null),
});

export const ScheduledMessageSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  channelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel ID'),
  enabled: z.boolean().default(true),
  type: z.enum(['text', 'embed']).default('text'),
  content: z.string().max(2000).optional().default(''),
  embed: AutomationEmbedSchema.optional().default({}),
  scheduleType: z.enum(['interval', 'daily', 'weekly', 'cron']).default('daily'),
  intervalHours: z.number().int().min(1).max(168).optional().default(24),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().default('12:00'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([1, 2, 3, 4, 5]),
  cronExpression: z.string().max(100).optional().default('0 12 * * *'),
  lastRunAt: z.string().nullable().optional().default(null),
});

export const AutoResponderSchema = z.object({
  id: z.string().min(1),
  trigger: z.string().trim().min(1).max(200),
  matchType: z.enum(['exact', 'contains', 'regex']).default('contains'),
  caseSensitive: z.boolean().default(false),
  replyType: z.enum(['channel', 'dm']).default('channel'),
  type: z.enum(['text', 'embed']).default('text'),
  content: z.string().max(2000).optional().default(''),
  embed: AutomationEmbedSchema.optional().default({}),
  enabled: z.boolean().default(true),
  allowedChannels: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  ignoredRoles: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  cooldownSeconds: z.number().int().min(0).max(3600).default(5),
});

export const AutomationsConfigSchema = z.object({
  stickyMessages: z.array(StickyMessageSchema).default([]),
  scheduledMessages: z.array(ScheduledMessageSchema).default([]),
  autoResponders: z.array(AutoResponderSchema).default([]),
}).default({ stickyMessages: [], scheduledMessages: [], autoResponders: [] });

export const TranscriptAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  size: z.number().optional(),
  contentType: z.string().nullable().optional(),
});

export const TranscriptMessageSchema = z.object({
  id: z.string(),
  author: z.object({
    id: z.string(),
    username: z.string(),
    discriminator: z.string().optional(),
    avatarUrl: z.string().nullable().optional(),
    bot: z.boolean().default(false),
  }),
  content: z.string().default(''),
  embeds: z.array(z.record(z.any())).default([]),
  attachments: z.array(TranscriptAttachmentSchema).default([]),
  createdAt: z.string(),
  pinned: z.boolean().default(false),
});

export const TicketTranscriptSchema = z.object({
  id: z.string(),
  guildId: z.string().regex(/^\d{17,20}$/),
  channelId: z.string().regex(/^\d{17,20}$/),
  ticketNumber: z.string().or(z.number()),
  title: z.string().default('Ticket Transcript'),
  ticketCreatorId: z.string().regex(/^\d{17,20}$/),
  ticketCreatorTag: z.string().default('Unknown User'),
  closedById: z.string().regex(/^\d{17,20}$/).optional().nullable(),
  closedByTag: z.string().optional().nullable(),
  closeReason: z.string().default('Ticket closed'),
  createdAt: z.string(),
  closedAt: z.string(),
  messageCount: z.number().default(0),
  viewToken: z.string(),
  messages: z.array(TranscriptMessageSchema).default([]),
});

export const AntiRaidConfigSchema = z.object({
  enabled: z.boolean().default(false),
  joinThreshold: z.number().int().min(3).max(50).default(5),
  windowSeconds: z.number().int().min(3).max(60).default(10),
  minAccountAgeHours: z.number().int().min(0).max(720).default(24),
  action: z.enum(['quarantine', 'kick', 'ban']).default('quarantine'),
  quarantineRoleId: z.string().regex(/^\d{17,20}$/).nullable().optional().default(null),
  lockdownOnRaid: z.boolean().default(false),
  lockdownChannelIds: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  alertChannelId: z.string().regex(/^\d{17,20}$/).nullable().optional().default(null),
  isLockdownActive: z.boolean().default(false),
  lastRaidTimestamp: z.string().nullable().optional().default(null),
}).default({
  enabled: false,
  joinThreshold: 5,
  windowSeconds: 10,
  minAccountAgeHours: 24,
  action: 'quarantine',
  quarantineRoleId: null,
  lockdownOnRaid: false,
  lockdownChannelIds: [],
  alertChannelId: null,
  isLockdownActive: false,
  lastRaidTimestamp: null,
});

export const RoleSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number().default(0),
  hoist: z.boolean().default(false),
  position: z.number().default(0),
  permissions: z.string().default('0'),
  mentionable: z.boolean().default(false),
});

export const OverwriteSnapshotSchema = z.object({
  id: z.string(),
  type: z.number().default(0),
  allow: z.string().default('0'),
  deny: z.string().default('0'),
});

export const ChannelSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  parentId: z.string().nullable().optional().default(null),
  position: z.number().default(0),
  topic: z.string().nullable().optional().default(null),
  nsfw: z.boolean().default(false),
  bitrate: z.number().optional(),
  userLimit: z.number().optional(),
  permissionOverwrites: z.array(OverwriteSnapshotSchema).default([]),
});

export const ServerSnapshotSchema = z.object({
  id: z.string(),
  guildId: z.string().regex(/^\d{17,20}$/),
  name: z.string(),
  createdAt: z.string(),
  createdBy: z.object({
    id: z.string(),
    tag: z.string(),
  }),
  counts: z.object({
    roles: z.number(),
    categories: z.number(),
    channels: z.number(),
  }),
  roles: z.array(RoleSnapshotSchema).default([]),
  channels: z.array(ChannelSnapshotSchema).default([]),
});

export const DailyAnalyticsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  joins: z.number().int().nonnegative().default(0),
  leaves: z.number().int().nonnegative().default(0),
  net: z.number().int().default(0),
  totalMembers: z.number().int().nonnegative().default(0),
  messages: z.number().int().nonnegative().default(0),
  activeUsers: z.number().int().nonnegative().default(0),
  channels: z.record(z.string(), z.number().int().nonnegative()).default({}),
});

export const ActivityHeatmapSchema = z.object({
  matrix: z.array(z.array(z.number().int().nonnegative())).default(() =>
    Array.from({ length: 7 }, () => Array(24).fill(0))
  ),
  totalMessages: z.number().int().nonnegative().default(0),
  lastUpdated: z.string().optional(),
});

export const InsightsOverviewSchema = z.object({
  guildId: z.string(),
  totalMembers: z.number().int().nonnegative(),
  growth7d: z.number().int().default(0),
  growth30d: z.number().int().default(0),
  messagesToday: z.number().int().nonnegative().default(0),
  messages7d: z.number().int().nonnegative().default(0),
  peakHour: z.number().int().min(0).max(23).default(0),
  peakDay: z.number().int().min(0).max(6).default(0),
  topChannels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    count: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
  })).default([]),
  history: z.array(DailyAnalyticsSchema).default([]),
  heatmap: ActivityHeatmapSchema.optional(),
});

export const SocialFeedItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['youtube', 'twitch', 'rss', 'webhook', 'tiktok', 'instagram']),
  name: z.string().trim().min(1).max(100),
  enabled: z.boolean().default(true),
  targetChannelId: z.string().regex(/^\d{17,20}$/, 'Invalid Discord channel ID'),
  customMessage: z.string().max(2000).default('{author} ha publicado nuevo contenido: {title}\n{url}'),
  mentionRole: z.string().nullable().optional().default(null),
  youtubeChannelId: z.string().optional().default(''),
  twitchUsername: z.string().optional().default(''),
  tiktokUsername: z.string().optional().default(''),
  instagramUsername: z.string().optional().default(''),
  rssFeedUrl: z.string().url().optional().or(z.literal('')).default(''),
  webhookToken: z.string().optional().default(''),
  lastItemId: z.string().nullable().optional().default(null),
  lastPublished: z.string().nullable().optional().default(null),
  lastChecked: z.string().nullable().optional().default(null),
  isLive: z.boolean().optional().default(false),
});

export const SocialFeedsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  checkIntervalMinutes: z.number().int().min(1).max(60).default(5),
  feeds: z.array(SocialFeedItemSchema).default([]),
}).default({ enabled: true, checkIntervalMinutes: 5, feeds: [] });

export const KnowledgeItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(150),
  content: z.string().trim().min(1).max(4000),
  tags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const AiAssistantConfigSchema = z.object({
  enabled: z.boolean().default(false),
  model: z.string().default('gemini-2.0-flash'),
  systemPrompt: z.string().max(4000).default(
    'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres amigable, servicial, conciso y respetuoso. Usa la base de conocimiento provista para responder preguntas sobre las reglas, canales y servicios del servidor.'
  ),
  allowedChannelIds: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  respondToMentions: z.boolean().default(true),
  ignoredRoleIds: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  cooldownSeconds: z.number().int().min(1).max(300).default(10),
  maxOutputTokens: z.number().int().min(50).max(2048).default(500),
  temperature: z.number().min(0).max(1).default(0.7),
  knowledgeBase: z.array(KnowledgeItemSchema).default([]),
}).default({
  enabled: false,
  model: 'gemini-2.0-flash',
  systemPrompt: 'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres amigable, servicial, conciso y respetuoso.',
  allowedChannelIds: [],
  respondToMentions: true,
  ignoredRoleIds: [],
  cooldownSeconds: 10,
  maxOutputTokens: 500,
  temperature: 0.7,
  knowledgeBase: [],
});

export const GuildConfigSchema = z
  .object({
    locale: z.enum(['auto', 'en-US', 'es-419', 'de']).default('auto'),
    prefix: z.string().optional(),
    modRole: z.string().nullable().optional(),
    adminRole: z.string().nullable().optional(),
    logChannelId: z.string().nullable().optional(),
    welcomeChannel: z.string().nullable().optional(),
    welcomeMessage: z.string().optional(),
    welcomeEnabled: z.boolean().optional(),
    welcomeType: z.enum(['text', 'embed']).optional(),
    welcomeEmbed: z
      .object({
        title: z.string().max(256).optional(),
        description: z.string().max(4096).optional(),
        color: z.string().optional(),
        footer: z.string().max(2048).optional(),
        image: z.string().url().nullable().optional().or(z.literal('')),
        thumbnail: z.boolean().optional(),
      })
      .optional(),
    welcomePing: z.boolean().optional(),
    autoRoleDelay: z.number().int().min(0).max(300).optional(),
    goodbyeEnabled: z.boolean().optional(),
    goodbyeChannelId: z.string().nullable().optional(),
    leaveMessage: z.string().max(2000).optional(),
    leaveType: z.enum(['text', 'embed']).optional(),
    leaveEmbed: z
      .object({
        title: z.string().max(256).optional(),
        description: z.string().max(4096).optional(),
        color: z.string().optional(),
        footer: z.string().max(2048).optional(),
        image: z.string().url().nullable().optional().or(z.literal('')),
        thumbnail: z.boolean().optional(),
      })
      .optional(),
    goodbyePing: z.boolean().optional(),
    autoRole: z.string().nullable().optional(),
    autoRoles: z.array(z.string()).default([]).optional(),
    dmOnClose: z.boolean().optional(),
    reportChannelId: z.string().nullable().optional(),
    birthdayChannelId: z.string().nullable().optional(),
    birthdayRoleId: z.string().nullable().optional(),
    birthdayMessage: z.string().max(1000).nullable().optional(),
    premiumRoleId: z.string().nullable().optional(),
    logIgnore: LogIgnoreSchema.optional(),
    disabledCommands: z.record(z.boolean()).optional(),
    disabledCategories: z.record(z.boolean()).optional(),
    logging: LoggingConfigSchema.optional(),
    ticketLogging: TicketLoggingSchema.optional(),
    enableLogging: z.boolean().optional(),
    verification: VerificationConfigSchema,
    leveling: LevelingConfigSchema,
    economy: EconomyConfigSchema,
    joinToCreate: JoinToCreateConfigSchema,
    moderation: ModerationConfigSchema.optional(),
    automations: AutomationsConfigSchema.optional(),
    antiRaid: AntiRaidConfigSchema.optional(),
    socialFeeds: SocialFeedsConfigSchema.optional(),
    aiAssistant: AiAssistantConfigSchema.optional(),
  })
  .passthrough();

export const EconomyDataSchema = z
  .object({
    wallet: z.number().nonnegative().default(0),
    bank: z.number().nonnegative().default(0),
    bankLevel: z.number().int().nonnegative().default(0),
    dailyStreak: z.number().int().nonnegative().default(0),
    lastDaily: z.number().int().nonnegative().default(0),
    lastWeekly: z.number().int().nonnegative().default(0),
    lastWork: z.number().int().nonnegative().default(0),
    lastCrime: z.number().int().nonnegative().default(0),
    lastRob: z.number().int().nonnegative().default(0),
    lastDeposit: z.number().int().nonnegative().default(0),
    lastWithdraw: z.number().int().nonnegative().default(0),
    xp: z.number().int().nonnegative().default(0),
    level: z.number().int().nonnegative().default(1),
    inventory: z.record(z.any()).default({}),
    cooldowns: z.record(z.number().int().nonnegative()).default({})
  })
  .passthrough();

const DEFAULT_LOGGING = {
  enabled: false,
  channels: { audit: null, applications: null, reports: null },
  ignore: { users: [], channels: [] },
  enabledEvents: {},
};

function migrateLoggingConfig(raw = {}, legacy = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const {
    logChannelId,
    reportChannelId,
    enableLogging,
    logIgnore,
  } = legacy;

  const auditChannel =
    base.channels?.audit ??
    base.channelId ??
    logChannelId ??
    null;

  const applicationsChannel = base.channels?.applications ?? null;

  const reportsChannel =
    base.channels?.reports ??
    reportChannelId ??
    null;

  const ignore = {
    users: base.ignore?.users ?? logIgnore?.users ?? [],
    channels: base.ignore?.channels ?? logIgnore?.channels ?? [],
  };

  let enabled = base.enabled ?? false;
  if (enableLogging === false) {
    enabled = false;
  } else if (auditChannel && base.enabled === undefined && enableLogging !== false) {
    enabled = base.enabled ?? Boolean(enableLogging);
  }

  const { channelId: _legacyChannelId, ignore: _ignore, channels: _channels, ...rest } = base;

  return {
    ...DEFAULT_LOGGING,
    ...rest,
    enabled,
    channels: {
      audit: auditChannel,
      applications: applicationsChannel,
      reports: reportsChannel,
    },
    ignore,
    enabledEvents: base.enabledEvents ?? {},
  };
}

export function stripLegacyLoggingFields(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const {
    logChannelId: _logChannelId,
    enableLogging: _enableLogging,
    reportChannelId: _reportChannelId,
    logIgnore: _logIgnore,
    ...rest
  } = config;

  if (rest.logging && typeof rest.logging === 'object') {
    const { channelId: _channelId, ...loggingRest } = rest.logging;
    rest.logging = loggingRest;
  }

  return rest;
}

export function normalizeGuildConfig(raw, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  merged.logging = migrateLoggingConfig(merged.logging, {
    logChannelId: merged.logChannelId,
    reportChannelId: merged.reportChannelId,
    enableLogging: merged.enableLogging,
    logIgnore: merged.logIgnore,
  });

  const parsed = GuildConfigSchema.safeParse(merged);
  const normalized = parsed.success ? parsed.data : { ...defaults, ...merged };

  normalized.logging = migrateLoggingConfig(normalized.logging, {
    logChannelId: normalized.logChannelId,
    reportChannelId: normalized.reportChannelId,
    enableLogging: normalized.enableLogging,
    logIgnore: normalized.logIgnore,
  });

  return stripLegacyLoggingFields(normalized);
}

export function normalizeEconomyData(raw, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };
  const parsed = EconomyDataSchema.safeParse(merged);
  return parsed.success ? parsed.data : { ...defaults, ...base };
}

export function validateGuildConfigOrThrow(rawConfig, context = {}) {
  const normalized = normalizeGuildConfig(rawConfig);
  const parsed = GuildConfigSchema.safeParse(normalized);

  if (parsed.success) {
    return stripLegacyLoggingFields({
      ...normalized,
      logging: migrateLoggingConfig(normalized.logging, {}),
    });
  }

  throw createError(
    'Invalid guild configuration payload',
    ErrorTypes.VALIDATION,
    'Configuration payload is invalid. Please review provided values and try again.',
    {
      ...context,
      errorCode: 'VALIDATION_FAILED',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    }
  );
}
