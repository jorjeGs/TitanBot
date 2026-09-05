import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { successEmbed } from '../utils/embeds.js';
import { getFromDb, setInDb } from '../utils/database.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { replyUserError, ErrorTypes } from '../utils/errorHandler.js';
import { t } from '../utils/i18n/index.js';

function buildSharedTodoViewPayload(listData, listId, guild, context = null) {
  const memberList = (listData.members || []).map(memberId => {
    const member = guild?.members?.cache?.get(memberId);
    return member ? member.user.username : `<@${memberId}>`;
  }).join(', ');

  const owner = guild?.members?.cache?.get(listData.creatorId);
  const ownerName = owner ? owner.user.username : `<@${listData.creatorId}>`;

  const tasks = Array.isArray(listData.tasks) ? listData.tasks : [];

  const ownerLabel = t('utility.todo_shared_owner', {}, context);
  const membersLabel = t('utility.todo_shared_members', {}, context);
  const btnAdd = t('utility.todo_shared_btn_add', {}, context);
  const btnComplete = t('utility.todo_shared_btn_complete', {}, context);
  const btnRemove = t('utility.todo_shared_btn_remove', {}, context);
  const listTitle = t('utility.todo_shared_title', { id: listId }, context);

  if (tasks.length === 0) {
    return {
      embeds: [
        successEmbed(
          `📋 **${listData.name}**\n\n` +
          `👑 **${ownerLabel}:** ${ownerName}\n` +
          `👥 **${membersLabel}:** ${memberList}\n\n` +
          t('utility.todo_shared_empty', {}, context),
          listTitle
        )
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`shared_todo_add_${listId}`)
            .setLabel(btnAdd)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`shared_todo_complete_${listId}`)
            .setLabel(btnComplete)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`shared_todo_remove_${listId}`)
            .setLabel(btnRemove)
            .setStyle(ButtonStyle.Danger)
        )
      ]
    };
  }

  const taskList = tasks
    .map(task =>
      `${task.completed ? '✅' : '📝'} #${task.id} ${task.text} ` +
      `\`[${new Date(task.createdAt).toLocaleDateString()}]` +
      (task.completed ? ' • ' + t('utility.todo_shared_completed_by', { user: `<@${task.completedBy}>` }, context) : '') + '`'
    )
    .join('\n');

  const tasksLabel = t('utility.todo_shared_tasks', {}, context);

  return {
    embeds: [
      successEmbed(
        `📋 **${listData.name}**\n\n` +
        `👑 **${ownerLabel}:** ${ownerName}\n` +
        `👥 **${membersLabel}:** ${memberList}\n\n` +
        `**${tasksLabel}:**\n${taskList}`,
        listTitle
      )
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shared_todo_add_${listId}`)
          .setLabel(btnAdd)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`shared_todo_complete_${listId}`)
          .setLabel(btnComplete)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`shared_todo_remove_${listId}`)
          .setLabel(btnRemove)
          .setStyle(ButtonStyle.Danger)
      )
    ]
  };
}

async function refreshSharedTodoMessage(interaction, listId, messageId) {
  if (!messageId || !interaction.channel) {
    return;
  }

  const listKey = `shared_todo_${listId}`;
  const listData = await getFromDb(listKey, null);
  if (!listData) {
    return;
  }

  try {
    const targetMessage = await interaction.channel.messages.fetch(messageId);
    if (!targetMessage) {
      return;
    }

    const updatedPayload = buildSharedTodoViewPayload(listData, listId, interaction.guild, interaction);
    await targetMessage.edit(updatedPayload);
  } catch (error) {
    logger.warn('Unable to refresh shared todo view message', {
      listId,
      messageId,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      error: error.message
    });
  }
}

const sharedTodoAddHandler = {
  name: 'shared_todo_add',
  async execute(interaction, client, args) {
    const listId = args[0];
    const sourceMessageId = interaction.message?.id;

    if (!listId || !/^[a-zA-Z0-9_-]{1,64}$/.test(listId)) {
      await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_btn_invalid_id', {}, interaction) });
      return;
    }
    
    const modal = new ModalBuilder()
      .setCustomId(`shared_todo_add_modal:${listId}:${sourceMessageId || ''}`)
      .setTitle(t('utility.todo_modal_add_title', {}, interaction));

    const taskInput = new TextInputBuilder()
      .setCustomId('task_text')
      .setLabel(t('utility.todo_modal_add_label', {}, interaction))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(200);

    const actionRow = new ActionRowBuilder().addComponents(taskInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  }
};

const sharedTodoCompleteHandler = {
  name: 'shared_todo_complete',
  async execute(interaction, client, args) {
    const listId = args[0];
    const sourceMessageId = interaction.message?.id;

    if (!listId || !/^[a-zA-Z0-9_-]{1,64}$/.test(listId)) {
      await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_btn_invalid_id', {}, interaction) });
      return;
    }
    
    const modal = new ModalBuilder()
      .setCustomId(`shared_todo_complete_modal:${listId}:${sourceMessageId || ''}`)
      .setTitle(t('utility.todo_modal_complete_title', {}, interaction));

    const taskIdInput = new TextInputBuilder()
      .setCustomId('task_id')
      .setLabel(t('utility.todo_modal_complete_label', {}, interaction))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(t('utility.todo_modal_complete_ph', {}, interaction));

    const actionRow = new ActionRowBuilder().addComponents(taskIdInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  }
};

const sharedTodoRemoveHandler = {
  name: 'shared_todo_remove',
  async execute(interaction, client, args) {
    const listId = args[0];
    const sourceMessageId = interaction.message?.id;

    if (!listId || !/^[a-zA-Z0-9_-]{1,64}$/.test(listId)) {
      await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_btn_invalid_id', {}, interaction) });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`shared_todo_remove_modal:${listId}:${sourceMessageId || ''}`)
      .setTitle(t('utility.todo_modal_remove_title', {}, interaction));

    const taskIdInput = new TextInputBuilder()
      .setCustomId('task_id')
      .setLabel(t('utility.todo_modal_remove_label', {}, interaction))
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(t('utility.todo_modal_remove_ph', {}, interaction));

    const actionRow = new ActionRowBuilder().addComponents(taskIdInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  }
};

const sharedTodoAddModalHandler = {
  name: 'shared_todo_add_modal',
  async execute(interaction, client, args) {
    const listId = args[0];
    const sourceMessageId = args[1] || null;
    const taskText = interaction.fields.getTextInputValue('task_text');
    const userId = interaction.user.id;

    try {
      const allowed = await checkRateLimit(`${userId}:shared_todo_add`, 5, 30000);
      if (!allowed) {
        return await replyUserError(interaction, { type: ErrorTypes.RATE_LIMIT, message: t('utility.todo_rate_limit_add', {}, interaction) });
      }

      if (!listId || !/^[a-zA-Z0-9_-]{1,64}$/.test(listId)) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_btn_invalid_id', {}, interaction) });
      }

      if (!taskText || taskText.trim().length === 0) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_empty_task', {}, interaction) });
      }

      const listKey = `shared_todo_${listId}`;
      let listData = await getFromDb(listKey, null);
      
      if (!listData) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_not_found', {}, interaction) });
      }

      if (!listData.members || !listData.members.includes(userId)) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_no_access', {}, interaction) });
      }

      if (!listData.tasks) listData.tasks = [];
      if (!listData.nextId) listData.nextId = 1;

      const newTask = {
        id: listData.nextId++,
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        createdBy: userId
      };
      
      listData.tasks.push(newTask);
      await setInDb(listKey, listData);

      await refreshSharedTodoMessage(interaction, listId, sourceMessageId);

      return interaction.reply({
        embeds: [successEmbed(t('utility.todo_task_added_title', {}, interaction), t('utility.todo_modal_added_desc', { task: taskText }, interaction))],
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      logger.error('Error in shared todo add modal:', error);
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_err_adding', {}, interaction) });
    }
  }
};

const sharedTodoCompleteModalHandler = {
  name: 'shared_todo_complete_modal',
  async execute(interaction, client, args) {
    const listId = args[0];
    const sourceMessageId = args[1] || null;
    const taskId = parseInt(interaction.fields.getTextInputValue('task_id'), 10);
    const userId = interaction.user.id;

    try {
      const allowed = await checkRateLimit(`${userId}:shared_todo_complete`, 5, 30000);
      if (!allowed) {
        return await replyUserError(interaction, { type: ErrorTypes.RATE_LIMIT, message: t('utility.todo_rate_limit_complete', {}, interaction) });
      }

      if (!listId || !/^[a-zA-Z0-9_-]{1,64}$/.test(listId)) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_btn_invalid_id', {}, interaction) });
      }

      if (!Number.isInteger(taskId) || taskId <= 0) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_id_must_be_positive', {}, interaction) });
      }

      const listKey = `shared_todo_${listId}`;
      let listData = await getFromDb(listKey, null);
      
      if (!listData) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_not_found', {}, interaction) });
      }

      if (!listData.members || !listData.members.includes(userId)) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_no_access', {}, interaction) });
      }

      if (!listData.tasks) listData.tasks = [];

      const task = listData.tasks.find(t => t.id === taskId);
      
      if (!task) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_task_not_found', {}, interaction) });
      }

      if (task.completed) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_already_completed', { id: task.id }, interaction) });
      }
      
      task.completed = true;
      task.completedBy = userId;
      task.completedAt = new Date().toISOString();
      
      await setInDb(listKey, listData);

      await refreshSharedTodoMessage(interaction, listId, sourceMessageId);
      
      return interaction.reply({
        embeds: [successEmbed(t('utility.todo_task_completed_title', {}, interaction), t('utility.todo_task_completed_desc', { task: task.text }, interaction))],
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      logger.error('Error in shared todo complete modal:', error);
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_err_completing', {}, interaction) });
    }
  }
};

const sharedTodoRemoveModalHandler = {
  name: 'shared_todo_remove_modal',
  async execute(interaction, client, args) {
    const listId = args[0];
    const sourceMessageId = args[1] || null;
    const taskId = parseInt(interaction.fields.getTextInputValue('task_id'), 10);
    const userId = interaction.user.id;

    try {
      const allowed = await checkRateLimit(`${userId}:shared_todo_remove`, 5, 30000);
      if (!allowed) {
        return await replyUserError(interaction, { type: ErrorTypes.RATE_LIMIT, message: t('utility.todo_rate_limit_remove', {}, interaction) });
      }

      if (!listId || !/^[a-zA-Z0-9_-]{1,64}$/.test(listId)) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_btn_invalid_id', {}, interaction) });
      }

      if (!Number.isInteger(taskId) || taskId <= 0) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_id_must_be_positive', {}, interaction) });
      }

      const listKey = `shared_todo_${listId}`;
      const listData = await getFromDb(listKey, null);

      if (!listData) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_not_found', {}, interaction) });
      }

      if (!listData.members || !listData.members.includes(userId)) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_no_access', {}, interaction) });
      }

      if (!Array.isArray(listData.tasks)) {
        listData.tasks = [];
      }

      const taskIndex = listData.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_shared_task_not_found', {}, interaction) });
      }

      const [removedTask] = listData.tasks.splice(taskIndex, 1);
      await setInDb(listKey, listData);

      await refreshSharedTodoMessage(interaction, listId, sourceMessageId);

      return interaction.reply({
        embeds: [successEmbed(t('utility.todo_task_removed_title', {}, interaction), t('utility.todo_modal_removed_desc', { task: removedTask.text }, interaction))],
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error('Error in shared todo remove modal:', error);
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.todo_err_removing', {}, interaction) });
    }
  }
};

export default sharedTodoAddHandler;
export { sharedTodoCompleteHandler, sharedTodoRemoveHandler, sharedTodoAddModalHandler, sharedTodoCompleteModalHandler, sharedTodoRemoveModalHandler };