import { patchGuildConfig } from '../../services/config/guildConfig.js';
import { logger } from '../../utils/logger.js';

/**
 * Returns all available bot commands grouped by category.
 */
export function getAllCommands(req, res) {
  const commands = req.client?.commands;

  if (!commands) {
    return res.json({
      success: true,
      categories: [],
    });
  }

  const categoriesMap = {};

  for (const cmd of commands.values()) {
    const category = cmd.category || 'Other';
    if (!categoriesMap[category]) {
      categoriesMap[category] = [];
    }

    categoriesMap[category].push({
      name: cmd.data?.name || cmd.name,
      description: cmd.data?.description || '',
    });
  }

  const categories = Object.keys(categoriesMap)
    .sort()
    .map((name) => ({
      name,
      commands: categoriesMap[name].sort((a, b) => a.name.localeCompare(b.name)),
    }));

  return res.json({
    success: true,
    categories,
  });
}

/**
 * Updates disabled commands and categories for a specific guild.
 */
export async function updateGuildCommands(req, res) {
  try {
    const { guildId } = req.params;
    const { disabledCommands, disabledCategories } = req.body;

    const patch = {};

    if (disabledCommands !== undefined && typeof disabledCommands === 'object') {
      patch.disabledCommands = disabledCommands;
    }

    if (disabledCategories !== undefined && typeof disabledCategories === 'object') {
      patch.disabledCategories = disabledCategories;
    }

    const updated = await patchGuildConfig(req.client, guildId, patch);

    return res.json({
      success: true,
      disabledCommands: updated.disabledCommands || {},
      disabledCategories: updated.disabledCategories || {},
    });
  } catch (error) {
    logger.error(`Failed to update command settings for guild ${req.params.guildId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'DatabaseError',
      message: 'Failed to update command toggles.',
    });
  }
}
