/**
 * Matrix Studio Image Processing Engine
 * Scales any image down to 30x10 RGB LED Matrix specifications
 */

export const MATRIX_WIDTH = 30;
export const MATRIX_HEIGHT = 10;
export const TOTAL_LEDS = MATRIX_WIDTH * MATRIX_HEIGHT; // 300

/**
 * Creates an empty 30x10 black pixel grid
 */
export function createEmptyGrid() {
  const grid = [];
  for (let i = 0; i < TOTAL_LEDS; i++) {
    grid.push([0, 0, 0]);
  }
  return grid;
}

/**
 * Process a File object into a 30x10 pixel array
 */
export function processImageFile(file, options = {}) {
  const {
    contrast = 1.0,
    brightness = 0,
    threshold = 10,
    grayscale = false
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = MATRIX_WIDTH;
          canvas.height = MATRIX_HEIGHT;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          // Disable smoothing for sharp pixelated downscaling
          ctx.imageSmoothingEnabled = false;

          // Draw scaled image
          ctx.drawImage(img, 0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);

          const imgData = ctx.getImageData(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
          const data = imgData.data;
          const pixels = [];

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            let a = data[i + 3] / 255;

            // Apply alpha channel blend with black background
            r = Math.round(r * a);
            g = Math.round(g * a);
            b = Math.round(b * a);

            // Brightness
            r += brightness;
            g += brightness;
            b += brightness;

            // Contrast
            if (contrast !== 1.0) {
              r = Math.round((r - 128) * contrast + 128);
              g = Math.round((g - 128) * contrast + 128);
              b = Math.round((b - 128) * contrast + 128);
            }

            if (grayscale) {
              const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
              r = lum;
              g = lum;
              b = lum;
            }

            // Low brightness noise threshold
            if (r < threshold && g < threshold && b < threshold) {
              r = 0;
              g = 0;
              b = 0;
            }

            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            pixels.push([r, g, b]);
          }

          resolve(pixels);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image data.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Built-in retro 30x10 pixel art presets
 */
export const PIXEL_PRESETS = {
  space_invader: () => {
    const grid = createEmptyGrid();
    // Centered retro space invader in cyan
    const sprite = [
      "   ##     ##   ",
      "    ##   ##    ",
      "   #########   ",
      "  ##  ###  ##  ",
      " ############# ",
      " # ####### # # ",
      " # #     # # # ",
      "    ##   ##    "
    ];
    const startX = 7;
    const startY = 1;
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        if (sprite[r][c] === '#') {
          const idx = (startY + r) * MATRIX_WIDTH + (startX + c);
          if (idx < TOTAL_LEDS) grid[idx] = [0, 240, 255];
        }
      }
    }
    return grid;
  },

  cyber_heart: () => {
    const grid = createEmptyGrid();
    const sprite = [
      "  ###   ###  ",
      " ##### ##### ",
      "#############",
      "#############",
      " ########### ",
      "  #########  ",
      "   #######   ",
      "     ###     "
    ];
    const startX = 8;
    const startY = 1;
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        if (sprite[r][c] === '#') {
          const idx = (startY + r) * MATRIX_WIDTH + (startX + c);
          if (idx < TOTAL_LEDS) {
            // Gradient magenta to pink
            const col = r < 3 ? [255, 0, 128] : [255, 60, 160];
            grid[idx] = col;
          }
        }
      }
    }
    return grid;
  },

  matrix_rain: () => {
    const grid = createEmptyGrid();
    for (let x = 0; x < MATRIX_WIDTH; x++) {
      const dropY = Math.floor(Math.sin(x * 0.8) * 4 + 5);
      for (let y = 0; y < MATRIX_HEIGHT; y++) {
        if (y === dropY) {
          grid[y * MATRIX_WIDTH + x] = [200, 255, 230]; // white-cyan head
        } else if (y < dropY && y > dropY - 4) {
          const fade = 255 - (dropY - y) * 60;
          grid[y * MATRIX_WIDTH + x] = [0, Math.max(20, fade), 40];
        }
      }
    }
    return grid;
  },

  lightning_bolt: () => {
    const grid = createEmptyGrid();
    const sprite = [
      "      #### ",
      "     ####  ",
      "    ####   ",
      "   ########",
      "  ######## ",
      "    ####   ",
      "   ####    ",
      "  ####     ",
      " ####      ",
      "###        "
    ];
    const startX = 10;
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        if (sprite[r][c] === '#') {
          const idx = r * MATRIX_WIDTH + (startX + c);
          if (idx < TOTAL_LEDS) grid[idx] = [255, 215, 0];
        }
      }
    }
    return grid;
  }
};
