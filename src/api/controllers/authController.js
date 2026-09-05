import { generateOAuthState, getOAuthUrl, exchangeCodeForTokens, fetchDiscordUser } from '../utils/oauthHelper.js';
import { createSessionToken } from '../utils/tokenHelper.js';
import { logger } from '../../utils/logger.js';

/**
 * Initiates the Discord OAuth2 authorization flow.
 */
export function login(req, res) {
  try {
    const state = generateOAuthState();
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
    });

    const redirectUri = req.query.redirect_uri;
    const authUrl = getOAuthUrl(state, redirectUri);
    return res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to initiate OAuth login:', error);
    return res.status(500).json({
      success: false,
      error: 'OAuthError',
      message: 'Failed to initiate login flow.',
    });
  }
}

/**
 * Handles the Discord OAuth2 callback.
 */
export async function callback(req, res) {
  const { code, state, error } = req.query;
  const storedState = req.cookies?.oauth_state;

  res.clearCookie('oauth_state', { path: '/' });

  if (error) {
    logger.warn('OAuth callback returned error from Discord:', error);
    return res.redirect('/?error=' + encodeURIComponent(error));
  }

  if (!code || !state || !storedState || state !== storedState) {
    logger.warn('OAuth state mismatch or missing parameters');
    return res.redirect('/?error=invalid_state');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const discordUser = await fetchDiscordUser(tokens.access_token);

    const sessionPayload = {
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator || '0',
      avatar: discordUser.avatar,
      accessToken: tokens.access_token,
    };

    const sessionToken = createSessionToken(sessionPayload);
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('titanbot_session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return res.redirect('/servers');
  } catch (err) {
    logger.error('OAuth callback failed to complete:', err);
    return res.redirect('/?error=' + encodeURIComponent('auth_failed'));
  }
}

/**
 * Returns current authenticated user information.
 */
export function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Not logged in',
    });
  }

  return res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      discriminator: req.user.discriminator || '0',
      avatar: req.user.avatar,
    },
  });
}

/**
 * Logs out the authenticated user by clearing the session cookie.
 */
export function logout(req, res) {
  res.clearCookie('titanbot_session', { path: '/' });
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
}
