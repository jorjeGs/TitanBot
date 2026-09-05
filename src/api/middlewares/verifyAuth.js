import { verifySessionToken } from '../utils/tokenHelper.js';

/**
 * Middleware to authenticate requests via the titanbot_session cookie or Bearer token header.
 */
export function verifyAuth(req, res, next) {
  let token = req.cookies?.titanbot_session;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'No session token provided. Please log in.',
    });
  }

  const decoded = verifySessionToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired session. Please log in again.',
    });
  }

  req.user = decoded;
  next();
}
