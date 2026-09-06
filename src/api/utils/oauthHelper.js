import crypto from 'crypto';
import config from '../../config/application.js';

const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';

/**
 * Generates a cryptographically secure random string for CSRF state validation.
 * @returns {string} Random 64-character hex string.
 */
export function generateOAuthState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Builds the Discord OAuth2 authorization URL.
 * @param {string} state - CSRF state token.
 * @param {string} [redirectUri] - Optional custom redirect URI.
 * @returns {string} The full authorization URL.
 */
export function getOAuthUrl(state, redirectUri) {
  const clientId = config.bot?.clientId || process.env.CLIENT_ID;
  const dashboardBase = (config.dashboard?.url || 'http://localhost:3000').replace(/\/$/, '');
  const callbackUrl = redirectUri || `${dashboardBase}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'identify guilds',
    state,
    prompt: 'consent',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchanges the OAuth2 code for Discord access and refresh tokens.
 * @param {string} code - The code parameter returned from Discord.
 * @param {string} [redirectUri] - The callback URI used during authorization.
 * @returns {Promise<{ access_token: string, refresh_token: string, token_type: string, expires_in: number }>}
 */
export async function exchangeCodeForTokens(code, redirectUri) {
  const clientId = config.bot?.clientId || process.env.CLIENT_ID;
  const clientSecret = config.dashboard?.clientSecret || process.env.CLIENT_SECRET;
  const dashboardBase = (config.dashboard?.url || 'http://localhost:3000').replace(/\/$/, '');
  const callbackUrl = redirectUri || `${dashboardBase}/api/auth/callback`;

  if (!clientSecret) {
    throw new Error('CLIENT_SECRET is not configured in environment variables');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: callbackUrl,
  });

  const response = await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange Discord authorization code (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetches the Discord user profile for the authorized token.
 * @param {string} accessToken - Discord bearer access token.
 * @returns {Promise<{ id: string, username: string, avatar: string, discriminator: string }>}
 */
export async function fetchDiscordUser(accessToken) {
  const response = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Discord user profile (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetches the Discord guilds the authorized user belongs to.
 * @param {string} accessToken - Discord bearer access token.
 * @returns {Promise<Array<{ id: string, name: string, icon: string, owner: boolean, permissions: string }>>}
 */
export async function fetchDiscordUserGuilds(accessToken) {
  const response = await fetch(`${DISCORD_API_ENDPOINT}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Discord user guilds (${response.status}): ${errorText}`);
  }

  return await response.json();
}
