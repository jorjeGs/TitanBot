import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

export default {
    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Get real-time weather information for a location")
        .addStringOption((option) =>
            option
                .setName("city")
                .setDescription("The city name, e.g., 'London' or 'Tokyo'")
                .setRequired(true),
        ),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Weather interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'weather'
            });
            return;
        }

        const city = interaction.options.getString("city");

        const geoResponse = await fetch(
            `${GEOCODING_URL}?name=${encodeURIComponent(city)}`,
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            logger.info(`Weather command - city not found`, {
                userId: interaction.user.id,
                city: city,
                guildId: interaction.guildId
            });
            await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: t('utility.weather_not_found', { city }, interaction) });
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        const cityDisplay = name;

        const weatherResponse = await fetch(
            `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.error) {
            logger.error(`Weather API error`, {
                error: weatherData.reason,
                city: city,
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.weather_api_err', {}, interaction) });
            return;
        }

        const current = weatherData.current || weatherData.current_weather || {};
        const temperature = current.temperature != null ? Math.round(current.temperature) : "N/A";
        const humidity = current.relativehumidity ?? current.relative_humidity_2m ?? "N/A";
        const windSpeed = current.windspeed != null ? Math.round(current.windspeed) : "N/A";
        const weatherCode = current.weathercode ?? current.weather_code ?? null;

        const condition = getWeatherDescription(weatherCode, interaction);

        const embed = createEmbed({ title: t('utility.weather_title', { city: cityDisplay, country }, interaction), description: condition.description })
            .addFields(
                {
                    name: t('utility.weather_temp', {}, interaction),
                    value: `${temperature}°C`,
                    inline: true,
                },
                {
                    name: t('utility.weather_humidity', {}, interaction),
                    value: `${humidity}%`,
                    inline: true,
                },
                {
                    name: t('utility.weather_wind', {}, interaction),
                    value: `${windSpeed} km/h`,
                    inline: true,
                },
            )
            .setFooter({
                text: t('utility.weather_coords', { lat: latitude.toFixed(2), lon: longitude.toFixed(2) }, interaction),
            });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`Weather command executed`, {
            userId: interaction.user.id,
            city: cityDisplay,
            country: country,
            temperature: temperature,
            guildId: interaction.guildId
        });
    },
};

function getWeatherDescription(code, context) {
    if (code >= 0 && code <= 3) {
        return { description: t('utility.weather_cond_clear', {}, context), emoji: "" };
    } else if (code >= 45 && code <= 48) {
        return { description: t('utility.weather_cond_fog', {}, context), emoji: "" };
    } else if (code >= 51 && code <= 67) {
        return { description: t('utility.weather_cond_drizzle', {}, context), emoji: "" };
    } else if (code >= 71 && code <= 75) {
        return { description: t('utility.weather_cond_snow', {}, context), emoji: "" };
    } else if (code >= 80 && code <= 86) {
        return { description: t('utility.weather_cond_showers', {}, context), emoji: "" };
    } else if (code >= 95 && code <= 99) {
        return { description: t('utility.weather_cond_thunder', {}, context), emoji: "" };
    }
    return { description: t('utility.weather_cond_unknown', {}, context), emoji: "" };
}