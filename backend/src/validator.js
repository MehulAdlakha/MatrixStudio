/**
 * Validation utilities for Matrix Studio REST API
 * Supports 30x10 LED Matrix (300 WS2812 LEDs)
 */

export const MATRIX_WIDTH = 30;
export const MATRIX_HEIGHT = 10;
export const TOTAL_LEDS = MATRIX_WIDTH * MATRIX_HEIGHT; // 300

/**
 * Validates and normalizes color to [r, g, b] array with values 0-255
 */
export function validateColor(color, defaultColor = [255, 0, 128]) {
  if (!color) return defaultColor;

  // If already [r, g, b] array
  if (Array.isArray(color) && color.length >= 3) {
    const r = Math.max(0, Math.min(255, parseInt(color[0], 10) || 0));
    const g = Math.max(0, Math.min(255, parseInt(color[1], 10) || 0));
    const b = Math.max(0, Math.min(255, parseInt(color[2], 10) || 0));
    return [r, g, b];
  }

  // If hex string like '#ff0080' or 'ff0080'
  if (typeof color === 'string') {
    let clean = color.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length === 6) {
      const num = parseInt(clean, 16);
      if (!isNaN(num)) {
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
      }
    }
  }

  return defaultColor;
}

/**
 * Validates a display command payload
 */
export function validateCommand(type, params) {
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Command "type" is required and must be a string.' };
  }

  const validTypes = ['text', 'image', 'animation', 'brightness', 'clear'];
  if (!validTypes.includes(type)) {
    return {
      valid: false,
      error: `Invalid command type "${type}". Allowed types: ${validTypes.join(', ')}`
    };
  }

  if (!params || typeof params !== 'object') {
    params = {};
  }

  switch (type) {
    case 'text':
      return validateTextParams(params);
    case 'image':
      return validateImageParams(params);
    case 'animation':
      return validateAnimationParams(params);
    case 'brightness':
      return validateBrightnessParams(params);
    case 'clear':
      return { valid: true, sanitized: {} };
    default:
      return { valid: false, error: 'Unknown command type' };
  }
}

function validateTextParams(params) {
  if (typeof params.text !== 'string' || params.text.trim().length === 0) {
    return { valid: false, error: 'Text content is required and cannot be empty.' };
  }

  if (params.text.length > 200) {
    return { valid: false, error: 'Text length cannot exceed 200 characters.' };
  }

  const allowedModes = ['scroll_left', 'scroll_right', 'static', 'blink', 'bounce'];
  const mode = allowedModes.includes(params.mode) ? params.mode : 'scroll_left';

  const allowedFonts = ['standard', 'bold', 'mini', 'digital'];
  const font = allowedFonts.includes(params.font) ? params.font : 'standard';

  const speed = Math.max(10, Math.min(1000, parseInt(params.speed, 10) || 50));
  const yOffset = Math.max(-5, Math.min(10, parseInt(params.yOffset, 10) || 1));

  const color = validateColor(params.color, [0, 255, 200]); // Cyber cyan default
  const bgColor = validateColor(params.bgColor, [0, 0, 0]);

  return {
    valid: true,
    sanitized: {
      text: params.text.trim(),
      color,
      bgColor,
      speed,
      mode,
      font,
      yOffset
    }
  };
}

function validateImageParams(params) {
  if (!params.pixels || !Array.isArray(params.pixels)) {
    return {
      valid: false,
      error: `Pixel array is required. Expected array of ${TOTAL_LEDS} pixels (${MATRIX_WIDTH}x${MATRIX_HEIGHT}).`
    };
  }

  if (params.pixels.length !== TOTAL_LEDS) {
    return {
      valid: false,
      error: `Invalid pixel count. Expected ${TOTAL_LEDS} pixels for a ${MATRIX_WIDTH}x${MATRIX_HEIGHT} matrix, received ${params.pixels.length}.`
    };
  }

  const sanitizedPixels = [];
  for (let i = 0; i < params.pixels.length; i++) {
    const px = params.pixels[i];
    sanitizedPixels.push(validateColor(px, [0, 0, 0]));
  }

  return {
    valid: true,
    sanitized: {
      width: MATRIX_WIDTH,
      height: MATRIX_HEIGHT,
      pixels: sanitizedPixels
    }
  };
}

function validateAnimationParams(params) {
  const allowedNames = [
    'rainbow',
    'fire',
    'matrix_rain',
    'pulse',
    'starfield',
    'cyber_grid',
    'color_wipe'
  ];

  if (!params.name || !allowedNames.includes(params.name)) {
    return {
      valid: false,
      error: `Invalid animation name "${params.name}". Allowed: ${allowedNames.join(', ')}`
    };
  }

  const speed = Math.max(10, Math.min(1000, parseInt(params.speed, 10) || 50));
  const intensity = Math.max(1, Math.min(100, parseInt(params.intensity, 10) || 80));
  const primaryColor = validateColor(params.primaryColor, [0, 255, 230]);
  const secondaryColor = validateColor(params.secondaryColor, [255, 0, 128]);

  return {
    valid: true,
    sanitized: {
      name: params.name,
      speed,
      intensity,
      primaryColor,
      secondaryColor
    }
  };
}

function validateBrightnessParams(params) {
  const rawValue = parseInt(params.value, 10);
  if (isNaN(rawValue) || rawValue < 0 || rawValue > 255) {
    return {
      valid: false,
      error: 'Brightness value must be an integer between 0 and 255.'
    };
  }

  return {
    valid: true,
    sanitized: {
      value: rawValue
    }
  };
}
