import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import {
    createSelectMenu,
} from "../../utils/components.js";
import { t, localizeSlashCommand } from '../../utils/i18n/index.js';
import { logger } from '../../utils/logger.js';
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const BUG_REPORT_BUTTON_ID = "help-bug-report";
const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

const CATEGORY_ICONS = {
    Core: "ℹ️",
    Moderation: "🛡️",
    Economy: "💰",
    Music: "🎵",
    Fun: "🎮",
    Leveling: "📊",
    Utility: "🔧",
    Ticket: "🎫",
    Welcome: "👋",
    Giveaway: "🎉",
    Counter: "🔢",
    Tools: "🛠️",
    Search: "🔍",
    "Reaction Roles": "🎭",
    Community: "👥",
    Birthday: "🎂",
    "Join To Create": "🔌",
    Verification: "✅",
};

function formatCategoryName(rawCategory) {
    return rawCategory
        .replace(/_/g, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function createInitialHelpMenu(client, target = null, guildConfig = null) {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const options = [
        {
            label: t('core.help.all_commands', {}, target, guildConfig),
            description: t('core.help.all_commands_desc', {}, target, guildConfig),
            value: ALL_COMMANDS_ID,
        },
        ...categoryDirs.map((category) => {
            const categoryName = formatCategoryName(category);
            const icon = CATEGORY_ICONS[categoryName] || "🔍";
            return {
                label: `${icon} ${categoryName}`,
                description: t('core.help.category_desc', { category: categoryName }, target, guildConfig),
                value: category,
            };
        }),
    ];

    const botName = client?.user?.username || "Bot";
    const embed = createEmbed({
        title: t('core.help.title', { botName }, target, guildConfig),
        description: t('core.help.description', {}, target, guildConfig),
        color: 'primary',
        thumbnail: client.user?.displayAvatarURL?.({ size: 1024 }),
        fields: [
            {
                name: t('core.help.getting_started.title', {}, target, guildConfig),
                value: [
                    t('core.help.getting_started.step1', {}, target, guildConfig),
                    t('core.help.getting_started.step2', {}, target, guildConfig),
                    t('core.help.getting_started.step3', {}, target, guildConfig),
                ].join('\n'),
                inline: false,
            },
            {
                name: t('core.help.how_it_works.title', {}, target, guildConfig),
                value: [
                    t('core.help.how_it_works.point1', {}, target, guildConfig),
                    t('core.help.how_it_works.point2', {}, target, guildConfig),
                    t('core.help.how_it_works.point3', {}, target, guildConfig),
                ].join('\n'),
                inline: false,
            },
            {
                name: '\u200B',
                value: t('core.help.footer_opensource', {
                    botName,
                    url: 'https://youtu.be/1jCZX8s3bJE?si=NPOYx-vxVE1I5vJK',
                }, target, guildConfig),
                inline: false,
            },
        ],
    });

    embed.setFooter({ 
        text: t('common.footer.made_with', {}, target, guildConfig),
    });
    embed.setTimestamp();

    const bugReportButton = new ButtonBuilder()
        .setCustomId(BUG_REPORT_BUTTON_ID)
        .setLabel(t('common.buttons.report_bug', {}, target, guildConfig))
        .setStyle(ButtonStyle.Danger);

    const supportButton = new ButtonBuilder()
        .setLabel(t('common.buttons.support_server', {}, target, guildConfig))
        .setURL("https://discord.gg/QnWNz2dKCE")
        .setStyle(ButtonStyle.Link);

    const selectRow = createSelectMenu(
        CATEGORY_SELECT_ID,
        t('core.help.select_placeholder', {}, target, guildConfig),
        options,
    );

    const buttonRow = new ActionRowBuilder().addComponents([
        bugReportButton,
        supportButton,
    ]);

    return {
        embeds: [embed],
        components: [buttonRow, selectRow],
    };
}

const commandBuilder = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays the help menu with all available commands");

localizeSlashCommand(commandBuilder, 'help');

export default {
    slashOnly: true,
    data: commandBuilder,

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);
        
        const { embeds, components } = await createInitialHelpMenu(client, interaction, guildConfig);

        await InteractionHelper.safeEditReply(interaction, {
            embeds,
            components,
        });

        setTimeout(async () => {
            try {
                if (!InteractionHelper.isInteractionValid(interaction)) {
                    return;
                }

                const closedEmbed = createEmbed({
                    title: t('core.help.menu_closed.title', {}, interaction, guildConfig),
                    description: t('core.help.menu_closed.description', {}, interaction, guildConfig),
                    color: "secondary",
                });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch (error) {
                logger.debug('Help menu close edit failed (interaction may have expired):', error?.message);
            }
        }, HELP_MENU_TIMEOUT_MS);
    },
};