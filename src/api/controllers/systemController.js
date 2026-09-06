/**
 * Controller for system diagnostics and environment configuration checks.
 * Detects missing or unconfigured environment variables and API keys safely.
 */

export function getSystemEnvWarnings(req, res) {
  const warnings = [];

  // Check 1: Google Gemini API Key (Community AI Assistant)
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  if (!hasGeminiKey) {
    warnings.push({
      id: 'gemini_api_key',
      key: 'GEMINI_API_KEY',
      feature: 'gemini',
      severity: 'warning',
      category: 'ai',
      link: 'https://aistudio.google.com/app/apikey',
      linkText: 'Google AI Studio',
    });
  }

  // Check 2: Twitch Helix Credentials (Social Feeds Twitch Alerts)
  const hasTwitchClientId = Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_ID.trim());
  const hasTwitchClientSecret = Boolean(process.env.TWITCH_CLIENT_SECRET && process.env.TWITCH_CLIENT_SECRET.trim());
  if (!hasTwitchClientId || !hasTwitchClientSecret) {
    warnings.push({
      id: 'twitch_credentials',
      key: 'TWITCH_CLIENT_ID & TWITCH_CLIENT_SECRET',
      feature: 'twitch',
      severity: 'warning',
      category: 'social',
      link: 'https://dev.twitch.tv/console',
      linkText: 'Twitch Developer Console',
    });
  }

  // Check 3: Lavalink Dedicated Nodes (Music)
  const hasCustomLavalink = Boolean(
    (process.env.LAVALINK_NODES && process.env.LAVALINK_NODES.trim()) ||
    (process.env.LAVALINK_HOST && process.env.LAVALINK_HOST !== 'localhost')
  );
  if (!hasCustomLavalink) {
    warnings.push({
      id: 'lavalink_custom_nodes',
      key: 'LAVALINK_NODES',
      feature: 'lavalink',
      severity: 'info',
      category: 'music',
      link: 'https://lavalink.darrennathanael.com/',
      linkText: 'Lavalink SSL Nodes',
    });
  }

  const warningCount = warnings.filter((w) => w.severity === 'warning').length;

  return res.json({
    success: true,
    warnings,
    warningCount,
    allConfigured: warningCount === 0,
  });
}
