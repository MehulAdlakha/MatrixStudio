#include "animations.h"

AnimationController::AnimationController()
  : currentAnim(ANIM_NONE),
    currentName("none"),
    speedMs(50),
    intensity(80),
    primaryColor(0x00FFC8),
    secondaryColor(0xFF007F),
    lastFrameTime(0),
    frameCounter(0) {
  memset(heat, 0, sizeof(heat));
  for (int x = 0; x < MATRIX_WIDTH; x++) {
    rainPos[x] = -(rand() % MATRIX_HEIGHT);
    rainLength[x] = 3 + (rand() % 4);
    rainSpeed[x] = 1 + (rand() % 2);
  }
}

void AnimationController::configure(const String& animName, uint16_t speed, uint8_t intens,
                                     uint32_t pColor, uint32_t sColor) {
  currentName = animName;
  speedMs = speed;
  intensity = intens;
  primaryColor = pColor;
  secondaryColor = sColor;
  lastFrameTime = millis();
  frameCounter = 0;

  if (animName == "rainbow") {
    currentAnim = ANIM_RAINBOW;
  } else if (animName == "matrix_rain") {
    currentAnim = ANIM_MATRIX_RAIN;
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      rainPos[x] = -(rand() % MATRIX_HEIGHT);
      rainLength[x] = 3 + (rand() % 4);
    }
  } else if (animName == "fire") {
    currentAnim = ANIM_FIRE;
    memset(heat, 0, sizeof(heat));
  } else if (animName == "pulse") {
    currentAnim = ANIM_PULSE;
  } else if (animName == "starfield") {
    currentAnim = ANIM_STARFIELD;
    matrix.clear();
  } else if (animName == "color_wipe") {
    currentAnim = ANIM_COLOR_WIPE;
  } else {
    currentAnim = ANIM_RAINBOW; // default fallback
  }

  matrix.setMode(MODE_ANIMATION);
}

void AnimationController::stop() {
  currentAnim = ANIM_NONE;
  currentName = "none";
}

void AnimationController::update(uint32_t now) {
  if (currentAnim == ANIM_NONE) return;

  if (now - lastFrameTime >= speedMs) {
    lastFrameTime = now;
    frameCounter++;

    switch (currentAnim) {
      case ANIM_RAINBOW:     renderRainbow(); break;
      case ANIM_MATRIX_RAIN: renderMatrixRain(); break;
      case ANIM_FIRE:        renderFire(); break;
      case ANIM_PULSE:       renderPulse(); break;
      case ANIM_STARFIELD:   renderStarfield(); break;
      case ANIM_COLOR_WIPE:  renderColorWipe(); break;
      default: break;
    }

    matrix.show();
  }
}

// -------------------------------------------------------------
// Animation 1: Rainbow Cycle / Diagonal Wave
// -------------------------------------------------------------
void AnimationController::renderRainbow() {
  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
      uint8_t hue = (frameCounter * 3) + (x * 7) + (y * 14);
      matrix.setPixel(x, y, wheel(hue));
    }
  }
}

// -------------------------------------------------------------
// Animation 2: Matrix Digital Rain (Cyberpunk Green / Custom Color)
// -------------------------------------------------------------
void AnimationController::renderMatrixRain() {
  matrix.clear();

  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    // Only update position every few frames based on column speed
    uint8_t spd = rainSpeed[x] > 0 ? rainSpeed[x] : 1;
    if (frameCounter % spd == 0) {
      rainPos[x]++;
      if (rainPos[x] - rainLength[x] >= MATRIX_HEIGHT) {
        rainPos[x] = 0;
        rainLength[x] = 2 + (rand() % 5);
        rainSpeed[x] = 1 + (rand() % 3);
      }
    }

    int8_t head = rainPos[x];
    for (int8_t i = 0; i < rainLength[x]; i++) {
      int8_t y = head - i;
      if (y >= 0 && y < MATRIX_HEIGHT) {
        if (i == 0) {
          // Bright white / cyan head
          matrix.setPixel(x, (uint8_t)y, 220, 255, 240);
        } else {
          // Fading tail (Matrix green or primary color)
          float factor = 1.0f - ((float)i / rainLength[x]);
          uint8_t r = ((primaryColor >> 16) & 0xFF) * factor;
          uint8_t g = ((primaryColor >> 8) & 0xFF) * factor;
          uint8_t b = (primaryColor & 0xFF) * factor;
          matrix.setPixel(x, (uint8_t)y, r, g, b);
        }
      }
    }
  }
}

// -------------------------------------------------------------
// Animation 3: Procedural Fire Simulation for 30x10 Matrix
// -------------------------------------------------------------
void AnimationController::renderFire() {
  // Step 1: Cool down every cell slightly
  for (int x = 0; x < MATRIX_WIDTH; x++) {
    for (int y = 0; y < MATRIX_HEIGHT; y++) {
      int cooling = (rand() % 4) + 1;
      if (cooling > heat[x][y]) {
        heat[x][y] = 0;
      } else {
        heat[x][y] -= cooling;
      }
    }
  }

  // Step 2: Heat from bottom cells rises and diffuses
  for (int y = 0; y < MATRIX_HEIGHT - 1; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      int left = (x > 0) ? x - 1 : MATRIX_WIDTH - 1;
      int right = (x < MATRIX_WIDTH - 1) ? x + 1 : 0;
      heat[x][y] = (heat[left][y + 1] + heat[x][y + 1] + heat[right][y + 1]) / 3;
    }
  }

  // Step 3: Randomly ignite new sparks at the bottom row (y = MATRIX_HEIGHT - 1)
  for (int x = 0; x < MATRIX_WIDTH; x++) {
    if ((rand() % 100) < intensity) {
      heat[x][MATRIX_HEIGHT - 1] = 160 + (rand() % 95);
    }
  }

  // Step 4: Map heat to color palette (Black -> Red -> Orange -> Yellow -> White)
  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
      uint8_t t = heat[x][y];
      uint8_t r = 0, g = 0, b = 0;

      if (t > 180) {
        r = 255;
        g = 200 + ((t - 180) * 55 / 75);
        b = (t - 180) * 180 / 75;
      } else if (t > 90) {
        r = 255;
        g = (t - 90) * 200 / 90;
        b = 0;
      } else if (t > 20) {
        r = (t - 20) * 255 / 70;
        g = 0;
        b = 0;
      }

      matrix.setPixel(x, y, r, g, b);
    }
  }
}

// -------------------------------------------------------------
// Animation 4: Color Pulse / Breathing
// -------------------------------------------------------------
void AnimationController::renderPulse() {
  float angle = (frameCounter % 100) * (2.0f * 3.14159f / 100.0f);
  float blend = (sin(angle) + 1.0f) / 2.0f; // 0.0 to 1.0

  uint32_t activeColor = lerpColor(primaryColor, secondaryColor, blend);

  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
      matrix.setPixel(x, y, activeColor);
    }
  }
}

// -------------------------------------------------------------
// Animation 5: Starfield / Twinkling Cyber Sparkles
// -------------------------------------------------------------
void AnimationController::renderStarfield() {
  // Fade existing pixels slightly
  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
      uint16_t idx = matrix.XY(x, y);
      if (idx < NUM_LEDS) {
        // Simple decay: 85% retention
        matrix.setPixel(x, y, 0, 0, 0); // clear and recreate or seed new
      }
    }
  }

  // Spawn new random stars based on intensity
  int numStars = 1 + (intensity / 15);
  for (int s = 0; s < numStars; s++) {
    uint8_t x = rand() % MATRIX_WIDTH;
    uint8_t y = rand() % MATRIX_HEIGHT;
    uint32_t color = (rand() % 2 == 0) ? primaryColor : secondaryColor;
    matrix.setPixel(x, y, color);
  }
}

// -------------------------------------------------------------
// Animation 6: Scanning Color Wipe
// -------------------------------------------------------------
void AnimationController::renderColorWipe() {
  uint8_t col = (frameCounter / 2) % MATRIX_WIDTH;
  bool toggle = ((frameCounter / (2 * MATRIX_WIDTH)) % 2) == 0;
  uint32_t color = toggle ? primaryColor : secondaryColor;

  for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
    matrix.setPixel(col, y, color);
  }
}

// Color Wheel Helper
uint32_t AnimationController::wheel(uint8_t pos) {
  pos = 255 - pos;
  if (pos < 85) {
    return matrix.Color(255 - pos * 3, 0, pos * 3);
  }
  if (pos < 170) {
    pos -= 85;
    return matrix.Color(0, pos * 3, 255 - pos * 3);
  }
  pos -= 170;
  return matrix.Color(pos * 3, 255 - pos * 3, 0);
}

// Linear color interpolation
uint32_t AnimationController::lerpColor(uint32_t c1, uint32_t c2, float t) {
  if (t <= 0.0f) return c1;
  if (t >= 1.0f) return c2;

  uint8_t r1 = (c1 >> 16) & 0xFF;
  uint8_t g1 = (c1 >> 8) & 0xFF;
  uint8_t b1 = c1 & 0xFF;

  uint8_t r2 = (c2 >> 16) & 0xFF;
  uint8_t g2 = (c2 >> 8) & 0xFF;
  uint8_t b2 = c2 & 0xFF;

  uint8_t r = r1 + (r2 - r1) * t;
  uint8_t g = g1 + (g2 - g1) * t;
  uint8_t b = b1 + (b2 - b1) * t;

  return matrix.Color(r, g, b);
}

AnimationController animations;
