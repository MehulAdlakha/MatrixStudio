#ifndef ANIMATIONS_H
#define ANIMATIONS_H

#include <Arduino.h>
#include "matrix_driver.h"

enum AnimationType {
  ANIM_NONE,
  ANIM_RAINBOW,
  ANIM_MATRIX_RAIN,
  ANIM_FIRE,
  ANIM_PULSE,
  ANIM_STARFIELD,
  ANIM_COLOR_WIPE
};

class AnimationController {
public:
  AnimationController();
  void configure(const String& animName, uint16_t speedMs, uint8_t intensity,
                 uint32_t primaryColor, uint32_t secondaryColor);
  void update(uint32_t now);
  void stop();
  bool isRunning() const { return currentAnim != ANIM_NONE; }
  String getCurrentAnimName() const { return currentName; }

private:
  AnimationType currentAnim;
  String currentName;
  uint16_t speedMs;
  uint8_t intensity;
  uint32_t primaryColor;
  uint32_t secondaryColor;
  uint32_t lastFrameTime;
  uint16_t frameCounter;

  // State buffers for complex animations
  uint8_t heat[MATRIX_WIDTH][MATRIX_HEIGHT];
  int8_t rainPos[MATRIX_WIDTH];
  uint8_t rainLength[MATRIX_WIDTH];
  uint8_t rainSpeed[MATRIX_WIDTH];

  // Specific animation renderers
  void renderRainbow();
  void renderMatrixRain();
  void renderFire();
  void renderPulse();
  void renderStarfield();
  void renderColorWipe();

  // Helper color functions
  uint32_t wheel(uint8_t pos);
  uint32_t lerpColor(uint32_t c1, uint32_t c2, float t);
};

extern AnimationController animations;

#endif // ANIMATIONS_H
