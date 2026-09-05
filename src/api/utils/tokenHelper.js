import jwt from 'jsonwebtoken';
import config from '../../config/application.js';

const getSessionSecret = () => {
  return process.env.SESSION_SECRET || config.dashboard?.sessionSecret || 'titanbot_session_secret_change_in_production_32chars';
};

/**
 * Creates a signed JWT session token with a 7-day expiration.
 * @param {object} payload - User information to encode in token.
 * @returns {string} Signed JWT.
 */
export function createSessionToken(payload) {
  const secret = getSessionSecret();
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * Verifies a JWT session token and returns the decoded payload, or null if invalid.
 * @param {string} token - JWT token string.
 * @returns {object|null} Decoded payload or null.
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  try {
    const secret = getSessionSecret();
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}
