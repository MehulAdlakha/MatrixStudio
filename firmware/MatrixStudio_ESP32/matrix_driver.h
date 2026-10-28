#ifndef MATRIX_DRIVER_H
#define MATRIX_DRIVER_H

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include "config.h"

enum DisplayMode {
  MODE_IDLE,
  MODE_TEXT,
  MODE_IMAGE,
  MODE_ANIMATION
};

enum TextScrollMode {
  SCROLL_LEFT,
  SCROLL_RIGHT,
  TEXT_STATIC,
  TEXT_BLINK,
  TEXT_BOUNCE
};

enum TextFont {
  FONT_STANDARD,
  FONT_BOLD,
  FONT_MINI,
  FONT_DIGITAL
};

class MatrixDriver {
public:
  MatrixDriver();
  void begin();
  void clear();
  void show();
  void setBrightness(uint8_t brightness);
  uint8_t getBrightness() const { return currentBrightness; }

  // Coordinate and pixel mapping (safe int16_t with bounds check)
  int32_t XY(int16_t x, int16_t y);
  void setPixel(int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b);
  void setPixel(int16_t x, int16_t y, uint32_t color);
  void setPixelByIndex(uint16_t index, uint8_t r, uint8_t g, uint8_t b);
  void setPixelByIndex(uint16_t index, uint32_t color);
  uint32_t Color(uint8_t r, uint8_t g, uint8_t b);

  // Drawing helpers
  void fill(uint8_t r, uint8_t g, uint8_t b);
  void drawImage(JsonArray pixels);
  int8_t drawChar(int16_t x, int16_t y, char c, TextFont font, uint32_t color, uint32_t bgColor);
  void drawString(int16_t x, int16_t y, const String& text, TextFont font, uint32_t color, uint32_t bgColor);
  int16_t calculateTextWidth(const String& text, TextFont font);

  // Text engine
  void configureText(const String& text, uint32_t color, uint32_t bgColor,
                     uint16_t speedMs, TextScrollMode mode, int8_t yOffset, TextFont font);
  void updateText(uint32_t now);

  // Mode management
  DisplayMode getCurrentMode() const { return currentMode; }
  void setMode(DisplayMode mode) { currentMode = mode; }
  String getModeString() const;

private:
  Adafruit_NeoPixel strip;
  uint8_t currentBrightness;
  DisplayMode currentMode;

  // Text scrolling state
  String currentText;
  uint32_t textColor;
  uint32_t textBgColor;
  uint16_t textSpeedMs;
  TextScrollMode scrollMode;
  TextFont textFont;
  int8_t textYOffset;
  int16_t scrollX;
  int16_t textPixelWidth;
  int8_t scrollDirection; // for bounce
  bool blinkState;
  uint32_t lastTextStepTime;
  uint32_t lastBlinkTime;
};

extern MatrixDriver matrix;

#endif // MATRIX_DRIVER_H
