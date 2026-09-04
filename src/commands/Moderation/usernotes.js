import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { getFromDb, setInDb, deleteFromDb, getUserNotesKey, getUserNotesListKey } from '../../utils/database.js';
import { sanitizeInput } from '../../utils/validation.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { t, localizeSlashCommand, localizeSubcommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("usernotes")
            .setDescription("Manage user notes for moderation purposes")
            .addSubcommand((subcommand) =>
                localizeSubcommand(
                    subcommand
                        .setName("add")
                        .setDescription("Add a note to a user")
                        .addUserOption((option) =>
                            localizeOption(
                                option
                                    .setName("target")
                                    .setDescription("The user to add a note for")
                                    .setRequired(true),
                                'usernotes',
                                'target',
                                'add',
                            ),
                        )
                        .addStringOption((option) =>
                            localizeOption(
                                option
                                    .setName("note")
                                    .setDescription("The note to add")
                                    .setRequired(true),
                                'usernotes',
                                'note',
                                'add',
                            ),
                        )
                        .addStringOption((option) =>
                            localizeOption(
                                option
                                    .setName("type")
                                    .setDescription("Type of note")
                                    .addChoices(
                                        { name: "Warning", name_localizations: { "es-419": "Advertencia", "de": "Warnung" }, value: "warning" },
                                        { name: "Positive", name_localizations: { "es-419": "Positiva", "de": "Positiv" }, value: "positive" },
                                        { name: "Neutral", name_localizations: { "es-419": "Neutral", "de": "Neutral" }, value: "neutral" },
                                        { name: "Alert", name_localizations: { "es-419": "Alerta", "de": "Alarm" }, value: "alert" },
                                    )
                                    .setRequired(false),
                                'usernotes',
                                'type',
                                'add',
                            ),
                        ),
                    'usernotes',
                    'add',
                ),
            )
            .addSubcommand((subcommand) =>
                localizeSubcommand(
                    subcommand
                        .setName("view")
                        .setDescription("View notes for a user")
                        .addUserOption((option) =>
                            localizeOption(
                                option
                                    .setName("target")
                                    .setDescription("The user to view notes for")
                                    .setRequired(true),
                                'usernotes',
                                'target',
                                'view',
                            ),
                        ),
                    'usernotes',
                    'view',
                ),
            )
            .addSubcommand((subcommand) =>
                localizeSubcommand(
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a specific note from a user")
                        .addUserOption((option) =>
                            localizeOption(
                                option
                                    .setName("target")
                                    .setDescription("The user to remove a note from")
                                    .setRequired(true),
                                'usernotes',
                                'target',
                                'remove',
                            ),
                        )
                        .addIntegerOption((option) =>
                            localizeOption(
                                option
                                    .setName("index")
                                    .setDescription("The index of the note to remove")
                                    .setRequired(true)
                                    .setMinValue(1),
                                'usernotes',
                                'index',
                                'remove',
                            ),
                        ),
                    'usernotes',
                    'remove',
                ),
            )
            .addSubcommand((subcommand) =>
                localizeSubcommand(
                    subcommand
                        .setName("clear")
                        .setDescription("Clear all notes for a user")
                        .addUserOption((option) =>
                            localizeOption(
                                option
                                    .setName("target")
                                    .setDescription("The user to clear notes for")
                                    .setRequired(true),
                                'usernotes',
                                'target',
                                'clear',
                            ),
                        ),
                    'usernotes',
                    'clear',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        'usernotes',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser("target");
        const guildId = interaction.guild.id;

        if (subcommand !== "view" && subcommand !== "remove" && subcommand !== "clear" && subcommand !== "add") {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: t('moderation.usernotes.invalid_subcommand', {}, interaction),
            });
        }

        let notes = [];
        if (targetUser) {
            const notesKey = getUserNotesKey(guildId, targetUser.id);
            notes = await getFromDb(notesKey, []);
        }

        try {
            switch (subcommand) {
                case "add":
                    return await handleAddNote(interaction, targetUser, notes, guildId);
                case "view":
                    return await handleViewNotes(interaction, targetUser, notes);
                case "remove":
                    return await handleRemoveNote(interaction, targetUser, notes, guildId);
                case "clear":
                    return await handleClearNotes(interaction, targetUser, notes, guildId);
                default:
                    return await replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message: t('moderation.usernotes.invalid_subcommand', {}, interaction),
                    });
            }
        } catch (error) {
            logger.error(`Error in usernotes command (${subcommand}):`, error);
            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: t('moderation.usernotes.error_processing', {}, interaction),
            });
        }
    }
};

async function handleAddNote(interaction, targetUser, notes, guildId) {
    let note = interaction.options.getString("note").trim();
    const type = interaction.options.getString("type") || "neutral";

    if (note.length > 1000) {
        return await replyUserError(interaction, {
            type: ErrorTypes.UNKNOWN,
            message: t('moderation.usernotes.too_long', {}, interaction),
        });
    }

    if (note.length === 0) {
        return await replyUserError(interaction, {
            type: ErrorTypes.UNKNOWN,
            message: t('moderation.usernotes.empty_note', {}, interaction),
        });
    }

    note = sanitizeInput(note);

    const noteData = {
        id: Date.now(),
        content: note,
        type: type,
        author: interaction.user.tag,
        authorId: interaction.user.id,
        timestamp: new Date().toISOString()
    };

    notes.push(noteData);

    const notesKey = getUserNotesKey(guildId, targetUser.id);
    await setInDb(notesKey, notes);

    const typeInfo = getNoteTypeInfo(type);

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            successEmbed(
                t('moderation.usernotes.added_title', { emoji: typeInfo.emoji }, interaction),
                t('moderation.usernotes.added_desc', {
                    type,
                    user: targetUser.tag,
                    note,
                    moderator: interaction.user.tag,
                    total: notes.length
                }, interaction),
            )
        ]
    });
}

async function handleViewNotes(interaction, targetUser, notes) {
    if (notes.length === 0) {
        return InteractionHelper.safeReply(interaction, {
            embeds: [
                infoEmbed(
                    t('moderation.usernotes.no_notes_title', {}, interaction),
                    t('moderation.usernotes.no_notes_desc', { user: targetUser.tag }, interaction),
                ),
            ],
        });
    }

    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let description = t('moderation.usernotes.view_header', { user: targetUser.tag, userId: targetUser.id }, interaction);
    
    sortedNotes.forEach((note, index) => {
        const typeInfo = getNoteTypeInfo(note.type);
        const date = new Date(note.timestamp).toLocaleDateString();
        description += t('moderation.usernotes.view_item', {
            emoji: typeInfo.emoji,
            index: index + 1,
            type: note.type,
            date,
            content: note.content,
            author: note.author
        }, interaction);
    });

    if (description.length > 4000) {
        description = description.substring(0, 3900) + t('moderation.usernotes.view_truncated', {}, interaction);
    }

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            infoEmbed(
                t('moderation.usernotes.view_title', { count: notes.length }, interaction),
                description
            )
        ]
    });
}

async function handleRemoveNote(interaction, targetUser, notes, guildId) {
    const index = interaction.options.getInteger("index") - 1;

    if (index < 0 || index >= notes.length) {
        return await replyUserError(interaction, {
            type: ErrorTypes.VALIDATION,
            message: t('moderation.usernotes.invalid_index', { count: notes.length }, interaction),
        });
    }

    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const removedNote = sortedNotes[index];
    const originalIndex = notes.indexOf(removedNote);
    notes.splice(originalIndex, 1);

    const notesKey = getUserNotesKey(guildId, targetUser.id);
    await setInDb(notesKey, notes);

    const typeInfo = getNoteTypeInfo(removedNote.type);

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            successEmbed(
                t('moderation.usernotes.removed_title', { emoji: typeInfo.emoji }, interaction),
                t('moderation.usernotes.removed_desc', {
                    index: index + 1,
                    user: targetUser.tag,
                    content: removedNote.content,
                    remaining: notes.length
                }, interaction),
            )
        ]
    });
}

async function handleClearNotes(interaction, targetUser, notes, guildId) {
    const noteCount = notes.length;
    
    if (noteCount === 0) {
        return InteractionHelper.safeReply(interaction, {
            embeds: [
                infoEmbed(
                    t('moderation.usernotes.clear_empty_title', {}, interaction),
                    t('moderation.usernotes.clear_empty_desc', { user: targetUser.tag }, interaction),
                ),
            ],
        });
    }

    notes.length = 0;

    const notesKey = getUserNotesKey(guildId, targetUser.id);
    await setInDb(notesKey, notes);

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            successEmbed(
                t('moderation.usernotes.cleared_title', {}, interaction),
                t('moderation.usernotes.cleared_desc', { count: noteCount, user: targetUser.tag }, interaction),
            )
        ]
    });
}

function getNoteTypeInfo(type) {
    const types = {
        warning: { emoji: "⚠️", color: "#FF6B6B" },
        positive: { emoji: "✅", color: "#51CF66" },
        neutral: { emoji: "📝", color: "#74C0FC" },
        alert: { emoji: "🚨", color: "#FFD43B" }
    };
    
    return types[type] || types.neutral;
}