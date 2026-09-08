import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly register bundled Noto Sans fonts
const fontsDir = path.resolve(__dirname, '../../assets/fonts');
const boldFont = path.join(fontsDir, 'NotoSans-Bold.ttf');
const regFont = path.join(fontsDir, 'NotoSans-Regular.ttf');

if (fs.existsSync(boldFont)) {
  try {
    GlobalFonts.registerFromPath(boldFont, 'NotoSansBold');
  } catch (err) {
    logger.debug('Failed to register NotoSansBold:', err?.message);
  }
}

if (fs.existsSync(regFont)) {
  try {
    GlobalFonts.registerFromPath(regFont, 'NotoSans');
  } catch (err) {
    logger.debug('Failed to register NotoSans:', err?.message);
  }
}

// Also load system fonts if available (e.g. DejaVu on Linux)
try {
  if (typeof GlobalFonts.loadSystemFonts === 'function') {
    GlobalFonts.loadSystemFonts();
  }
} catch {}

const CARD_WIDTH = 800;
const CARD_HEIGHT = 350;
const BORDER_RADIUS = 24;

/**
 * Safely fetches an image buffer from an external URL with timeout.
 */
async function fetchImageBuffer(url, timeoutMs = 4000) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  try {
    const response = await axios.get(trimmed, {
      responseType: 'arraybuffer',
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'TitanBot-CardGenerator/2.0 (DiscordBot)',
      },
      maxContentLength: 8 * 1024 * 1024, // 8MB limit
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.debug(`Failed to fetch card image from ${trimmed}:`, err?.message);
    return null;
  }
}

/**
 * Truncates text so it fits within a maximum canvas width.
 */
function fitText(ctx, text, maxWidth) {
  if (!text) return '';
  let str = String(text);
  if (ctx.measureText(str).width <= maxWidth) return str;

  while (str.length > 0 && ctx.measureText(`${str}…`).width > maxWidth) {
    str = str.slice(0, -1);
  }
  return `${str}…`;
}

/**
 * Draws a rounded rectangle path on the 2D context.
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Generates a dynamic Discord Welcome/Goodbye banner card.
 *
 * @param {Object} options
 * @param {string} [options.avatarUrl] Member avatar URL
 * @param {string} [options.username] Member username
 * @param {string} [options.title] Header title (e.g. "¡BIENVENIDO!")
 * @param {string} [options.subtitle] Subtitle or member count string
 * @param {string} [options.backgroundUrl] Custom background wallpaper URL
 * @param {string} [options.borderColor] Avatar circle ring color hex (default '#FFFFFF')
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateWelcomeCard({
  avatarUrl = '',
  username = 'Nuevo Miembro',
  title = '',
  subtitle = 'Welcome to the server!',
  backgroundUrl = '',
  borderColor = '#FFFFFF',
} = {}) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 1. Clip outer rounded corners for the whole card
  drawRoundedRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
  ctx.clip();

  // 2. Render background
  let bgLoaded = false;
  if (backgroundUrl) {
    const bgBuffer = await fetchImageBuffer(backgroundUrl);
    if (bgBuffer) {
      try {
        const bgImg = await loadImage(bgBuffer);
        // Draw image covering the entire card maintaining aspect ratio
        const scale = Math.max(CARD_WIDTH / bgImg.width, CARD_HEIGHT / bgImg.height);
        const w = bgImg.width * scale;
        const h = bgImg.height * scale;
        const x = (CARD_WIDTH - w) / 2;
        const y = (CARD_HEIGHT - h) / 2;
        ctx.drawImage(bgImg, x, y, w, h);
        bgLoaded = true;
      } catch (err) {
        logger.debug('Error decoding custom card background:', err?.message);
      }
    }
  }

  // Fallback gradient background if no custom image was provided or failed
  if (!bgLoaded) {
    const bgGradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    bgGradient.addColorStop(0, '#1e1f2f');
    bgGradient.addColorStop(0.5, '#2b2d42');
    bgGradient.addColorStop(1, '#11121a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Subtle decorative accents
    ctx.fillStyle = 'rgba(88, 101, 242, 0.15)'; // Blurple glow
    ctx.beginPath();
    ctx.arc(CARD_WIDTH / 2, CARD_HEIGHT / 2, 220, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Dark Overlay & Vignette for guaranteed high text readability
  const overlay = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  overlay.addColorStop(0, 'rgba(10, 11, 16, 0.35)');
  overlay.addColorStop(0.6, 'rgba(10, 11, 16, 0.55)');
  overlay.addColorStop(1, 'rgba(10, 11, 16, 0.82)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 4. Optional Top Title (e.g. "¡BIENVENIDO!" or "¡HASTA LUEGO!")
  if (title) {
    ctx.save();
    ctx.font = 'bold 15px "NotoSansBold", "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillText(title.toUpperCase(), CARD_WIDTH / 2, 34);
    ctx.restore();
  }

  // 5. Draw Avatar
  const avatarCenterX = CARD_WIDTH / 2;
  const avatarCenterY = title ? 132 : 124;
  const avatarRadius = 58;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let avatarLoaded = false;
  if (avatarUrl) {
    const avatarBuffer = await fetchImageBuffer(avatarUrl);
    if (avatarBuffer) {
      try {
        const avatarImg = await loadImage(avatarBuffer);
        ctx.drawImage(
          avatarImg,
          avatarCenterX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarRadius * 2,
          avatarRadius * 2
        );
        avatarLoaded = true;
      } catch (err) {
        logger.debug('Error decoding user avatar for card:', err?.message);
      }
    }
  }

  // Fallback avatar if failed to load
  if (!avatarLoaded) {
    ctx.fillStyle = '#5865F2';
    ctx.fillRect(
      avatarCenterX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
    // Draw default silhouette
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY - 12, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY + 46, 38, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Avatar Decorative Ring Border
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 1, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = borderColor && /^#[0-9A-Fa-f]{6}$/.test(borderColor) ? borderColor : '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // 6. Username Text
  ctx.save();
  ctx.font = 'bold 32px "NotoSansBold", "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  const safeUsername = fitText(ctx, username || 'Nuevo Miembro', 720);
  const usernameY = title ? 228 : 220;
  ctx.fillText(safeUsername, CARD_WIDTH / 2, usernameY);
  ctx.restore();

  // 7. Subtitle Text (Welcome message / Member count)
  ctx.save();
  ctx.font = '600 20px "NotoSans", "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#E2E8F0';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  const safeSubtitle = fitText(ctx, subtitle || 'Welcome to the server!', 740);
  const subtitleY = title ? 276 : 268;
  ctx.fillText(safeSubtitle, CARD_WIDTH / 2, subtitleY);
  ctx.restore();

  return canvas.toBuffer('image/png');
}
