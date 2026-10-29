#include "matrix_driver.h"

// =========================================================================
// Font 1: Standard 5x7 ASCII (Complete 32 to 126 including lowercase)
// =========================================================================
static const uint8_t font5x7[] PROGMEM = {
  0x00, 0x00, 0x00, 0x00, 0x00, // 32 ' '
  0x00, 0x00, 0x5F, 0x00, 0x00, // 33 '!'
  0x00, 0x07, 0x00, 0x07, 0x00, // 34 '"'
  0x14, 0x7F, 0x14, 0x7F, 0x14, // 35 '#'
  0x24, 0x2A, 0x7F, 0x2A, 0x12, // 36 '$'
  0x23, 0x13, 0x08, 0x64, 0x62, // 37 '%'
  0x36, 0x49, 0x55, 0x22, 0x50, // 38 '&'
  0x00, 0x05, 0x03, 0x00, 0x00, // 39 '''
  0x00, 0x1C, 0x22, 0x41, 0x00, // 40 '('
  0x00, 0x41, 0x22, 0x1C, 0x00, // 41 ')'
  0x14, 0x08, 0x3E, 0x08, 0x14, // 42 '*'
  0x08, 0x08, 0x3E, 0x08, 0x08, // 43 '+'
  0x00, 0x50, 0x30, 0x00, 0x00, // 44 ','
  0x08, 0x08, 0x08, 0x08, 0x08, // 45 '-'
  0x00, 0x60, 0x60, 0x00, 0x00, // 46 '.'
  0x20, 0x10, 0x08, 0x04, 0x02, // 47 '/'
  0x3E, 0x51, 0x49, 0x45, 0x3E, // 48 '0'
  0x00, 0x42, 0x7F, 0x40, 0x00, // 49 '1'
  0x42, 0x61, 0x51, 0x49, 0x46, // 50 '2'
  0x21, 0x41, 0x45, 0x4B, 0x31, // 51 '3'
  0x18, 0x14, 0x12, 0x7F, 0x10, // 52 '4'
  0x27, 0x45, 0x45, 0x45, 0x39, // 53 '5'
  0x3C, 0x4A, 0x49, 0x49, 0x30, // 54 '6'
  0x01, 0x71, 0x09, 0x05, 0x03, // 55 '7'
  0x36, 0x49, 0x49, 0x49, 0x36, // 56 '8'
  0x06, 0x49, 0x49, 0x29, 0x1E, // 57 '9'
  0x00, 0x36, 0x36, 0x00, 0x00, // 58 ':'
  0x00, 0x56, 0x36, 0x00, 0x00, // 59 ';'
  0x08, 0x14, 0x22, 0x41, 0x00, // 60 '<'
  0x14, 0x14, 0x14, 0x14, 0x14, // 61 '='
  0x00, 0x41, 0x22, 0x14, 0x08, // 62 '>'
  0x02, 0x01, 0x51, 0x09, 0x06, // 63 '?'
  0x32, 0x49, 0x79, 0x41, 0x3E, // 64 '@'
  0x7E, 0x11, 0x11, 0x11, 0x7E, // 65 'A'
  0x7F, 0x49, 0x49, 0x49, 0x36, // 66 'B'
  0x3E, 0x41, 0x41, 0x41, 0x22, // 67 'C'
  0x7F, 0x41, 0x41, 0x22, 0x1C, // 68 'D'
  0x7F, 0x49, 0x49, 0x49, 0x41, // 69 'E'
  0x7F, 0x09, 0x09, 0x09, 0x01, // 70 'F'
  0x3E, 0x41, 0x49, 0x49, 0x7A, // 71 'G'
  0x7F, 0x08, 0x08, 0x08, 0x7F, // 72 'H'
  0x00, 0x41, 0x7F, 0x41, 0x00, // 73 'I'
  0x20, 0x40, 0x41, 0x3F, 0x01, // 74 'J'
  0x7F, 0x08, 0x14, 0x22, 0x41, // 75 'K'
  0x7F, 0x40, 0x40, 0x40, 0x40, // 76 'L'
  0x7F, 0x02, 0x0C, 0x02, 0x7F, // 77 'M'
  0x7F, 0x04, 0x08, 0x10, 0x7F, // 78 'N'
  0x3E, 0x41, 0x41, 0x41, 0x3E, // 79 'O'
  0x7F, 0x09, 0x09, 0x09, 0x06, // 80 'P'
  0x3E, 0x41, 0x51, 0x21, 0x5E, // 81 'Q'
  0x7F, 0x09, 0x19, 0x29, 0x46, // 82 'R'
  0x46, 0x49, 0x49, 0x49, 0x31, // 83 'S'
  0x01, 0x01, 0x7F, 0x01, 0x01, // 84 'T'
  0x3F, 0x40, 0x40, 0x40, 0x3F, // 85 'U'
  0x1F, 0x20, 0x40, 0x20, 0x1F, // 86 'V'
  0x3F, 0x40, 0x38, 0x40, 0x3F, // 87 'W'
  0x63, 0x14, 0x08, 0x14, 0x63, // 88 'X'
  0x07, 0x08, 0x70, 0x08, 0x07, // 89 'Y'
  0x61, 0x51, 0x49, 0x45, 0x43, // 90 'Z'
  0x00, 0x7F, 0x41, 0x41, 0x00, // 91 '['
  0x02, 0x04, 0x08, 0x10, 0x20, // 92 '\'
  0x00, 0x41, 0x41, 0x7F, 0x00, // 93 ']'
  0x04, 0x02, 0x01, 0x02, 0x04, // 94 '^'
  0x40, 0x40, 0x40, 0x40, 0x40, // 95 '_'
  0x00, 0x01, 0x02, 0x04, 0x00, // 96 '`'
  0x20, 0x54, 0x54, 0x54, 0x78, // 97 'a'
  0x7F, 0x48, 0x44, 0x44, 0x38, // 98 'b'
  0x38, 0x44, 0x44, 0x44, 0x20, // 99 'c'
  0x38, 0x44, 0x44, 0x48, 0x7F, // 100 'd'
  0x38, 0x54, 0x54, 0x54, 0x18, // 101 'e'
  0x08, 0x7E, 0x09, 0x01, 0x02, // 102 'f'
  0x0C, 0x52, 0x52, 0x52, 0x3E, // 103 'g'
  0x7F, 0x08, 0x04, 0x04, 0x78, // 104 'h'
  0x00, 0x44, 0x7D, 0x40, 0x00, // 105 'i'
  0x20, 0x40, 0x44, 0x3D, 0x00, // 106 'j'
  0x7F, 0x10, 0x28, 0x44, 0x00, // 107 'k'
  0x00, 0x41, 0x7F, 0x40, 0x00, // 108 'l'
  0x7C, 0x04, 0x18, 0x04, 0x78, // 109 'm'
  0x7C, 0x08, 0x04, 0x04, 0x78, // 110 'n'
  0x38, 0x44, 0x44, 0x44, 0x38, // 111 'o'
  0x7C, 0x14, 0x14, 0x14, 0x08, // 112 'p'
  0x08, 0x14, 0x14, 0x18, 0x7C, // 113 'q'
  0x7C, 0x08, 0x04, 0x04, 0x08, // 114 'r'
  0x48, 0x54, 0x54, 0x54, 0x20, // 115 's'
  0x04, 0x3F, 0x44, 0x40, 0x20, // 116 't'
  0x3C, 0x40, 0x40, 0x20, 0x7C, // 117 'u'
  0x1C, 0x20, 0x40, 0x20, 0x1C, // 118 'v'
  0x3C, 0x40, 0x30, 0x40, 0x3C, // 119 'w'
  0x44, 0x28, 0x10, 0x28, 0x44, // 120 'x'
  0x0C, 0x50, 0x50, 0x50, 0x3C, // 121 'y'
  0x44, 0x64, 0x54, 0x4C, 0x44, // 122 'z'
  0x00, 0x08, 0x36, 0x41, 0x00, // 123 '{'
  0x00, 0x00, 0x7F, 0x00, 0x00, // 124 '|'
  0x00, 0x41, 0x36, 0x08, 0x00, // 125 '}'
  0x08, 0x08, 0x2A, 0x1C, 0x08  // 126 '~'
};

// =========================================================================
// Font 2: Compact Mini 3x5 (3 columns x 5 bits high)
// =========================================================================
static const uint8_t font3x5[] PROGMEM = {
  0x00, 0x00, 0x00, // ' '
  0x00, 0x17, 0x00, // '!'
  0x03, 0x00, 0x03, // '"'
  0x1F, 0x0A, 0x1F, // '#'
  0x09, 0x1F, 0x12, // '$'
  0x19, 0x04, 0x13, // '%'
  0x0A, 0x15, 0x12, // '&'
  0x00, 0x03, 0x00, // '''
  0x00, 0x0E, 0x11, // '('
  0x11, 0x0E, 0x00, // ')'
  0x0A, 0x04, 0x0A, // '*'
  0x04, 0x0E, 0x04, // '+'
  0x10, 0x08, 0x00, // ','
  0x04, 0x04, 0x04, // '-'
  0x00, 0x10, 0x00, // '.'
  0x10, 0x08, 0x04, // '/'
  0x1F, 0x11, 0x1F, // '0'
  0x00, 0x1F, 0x00, // '1'
  0x1D, 0x15, 0x17, // '2'
  0x15, 0x15, 0x1F, // '3'
  0x07, 0x04, 0x1F, // '4'
  0x17, 0x15, 0x1D, // '5'
  0x1F, 0x15, 0x1D, // '6'
  0x01, 0x01, 0x1F, // '7'
  0x1F, 0x15, 0x1F, // '8'
  0x17, 0x15, 0x1F, // '9'
  0x00, 0x0A, 0x00, // ':'
  0x00, 0x14, 0x00, // ';'
  0x04, 0x0A, 0x11, // '<'
  0x0A, 0x0A, 0x0A, // '='
  0x11, 0x0A, 0x04, // '>'
  0x01, 0x15, 0x02, // '?'
  0x0E, 0x15, 0x17, // '@'
  0x1E, 0x05, 0x1E, // 'A'
  0x1F, 0x15, 0x0A, // 'B'
  0x0E, 0x11, 0x11, // 'C'
  0x1F, 0x11, 0x0E, // 'D'
  0x1F, 0x15, 0x11, // 'E'
  0x1F, 0x05, 0x01, // 'F'
  0x0E, 0x11, 0x1D, // 'G'
  0x1F, 0x04, 0x1F, // 'H'
  0x11, 0x1F, 0x11, // 'I'
  0x08, 0x10, 0x0F, // 'J'
  0x1F, 0x04, 0x1B, // 'K'
  0x1F, 0x10, 0x10, // 'L'
  0x1F, 0x02, 0x1F, // 'M'
  0x1F, 0x06, 0x1F, // 'N'
  0x0E, 0x11, 0x0E, // 'O'
  0x1F, 0x05, 0x02, // 'P'
  0x0E, 0x19, 0x1E, // 'Q'
  0x1F, 0x0D, 0x16, // 'R'
  0x12, 0x15, 0x09, // 'S'
  0x01, 0x1F, 0x01, // 'T'
  0x0F, 0x10, 0x0F, // 'U'
  0x07, 0x18, 0x07, // 'V'
  0x1F, 0x08, 0x1F, // 'W'
  0x1B, 0x04, 0x1B, // 'X'
  0x03, 0x1C, 0x03, // 'Y'
  0x19, 0x15, 0x13  // 'Z'
};

// =========================================================================
// Font 3: Digital Clock 4x7 (7-Segment look for digits, fallback for letters)
// =========================================================================
static const uint8_t fontDigital[] PROGMEM = {
  0x3F, 0x41, 0x41, 0x3F, // '0'
  0x00, 0x00, 0x7F, 0x00, // '1'
  0x49, 0x49, 0x49, 0x79, // '2'
  0x41, 0x49, 0x49, 0x36, // '3'
  0x0F, 0x08, 0x7E, 0x08, // '4'
  0x4F, 0x49, 0x49, 0x31, // '5'
  0x3F, 0x49, 0x49, 0x31, // '6'
  0x01, 0x01, 0x61, 0x1F, // '7'
  0x36, 0x49, 0x49, 0x36, // '8'
  0x06, 0x49, 0x49, 0x3F, // '9'
  0x00, 0x36, 0x36, 0x00, // ':'
  0x08, 0x08, 0x08, 0x08  // '-'
};

MatrixDriver::MatrixDriver()
  : strip(NUM_LEDS, LED_PIN, LED_COLOR_ORDER + LED_SPEED),
    currentBrightness(SAFE_BRIGHTNESS),
    currentMode(MODE_IDLE),
    currentText(""),
    textColor(0x00FF88),
    textBgColor(0x000000),
    textSpeedMs(60),
    scrollMode(SCROLL_LEFT),
    textFont(FONT_STANDARD),
    textYOffset(1),
    scrollX(0),
    textPixelWidth(0),
    scrollDirection(1),
    blinkState(true),
    lastTextStepTime(0),
    lastBlinkTime(0),
    mirrorX(DEFAULT_MIRROR_X),
    mirrorY(DEFAULT_MIRROR_Y) {}

void MatrixDriver::begin() {
  strip.begin();
  strip.setBrightness(currentBrightness);
  clear();
  show();
}

void MatrixDriver::clear() {
  strip.clear();
}

void MatrixDriver::show() {
  strip.show();
}

void MatrixDriver::setBrightness(uint8_t brightness) {
  if (brightness > 180) brightness = 180; // Anti-voltage-drop safeguard
  currentBrightness = brightness;
  strip.setBrightness(brightness);
  strip.show();
}

/**
 * Bounds-safe Serpentine Coordinate to Physical LED Index Mapping
 * Automatically handles Universal Mirroring (Flip X and Flip Y) for all modes!
 */
int32_t MatrixDriver::XY(int16_t x, int16_t y) {
  if (x < 0 || x >= MATRIX_WIDTH || y < 0 || y >= MATRIX_HEIGHT) {
    return -1; // Out of bounds
  }

  // Universal mirror transformation (applies to text, image, animations)
  if (mirrorX) x = (MATRIX_WIDTH - 1) - x;
  if (mirrorY) y = (MATRIX_HEIGHT - 1) - y;

#if MATRIX_HORIZONTAL
  if (SERPENTINE_LAYOUT) {
    if (y % 2 == 1) {
      return (y * MATRIX_WIDTH) + (MATRIX_WIDTH - 1 - x);
    } else {
      return (y * MATRIX_WIDTH) + x;
    }
  } else {
    return (y * MATRIX_WIDTH) + x;
  }
#else
  if (SERPENTINE_LAYOUT) {
    if (x % 2 == 1) {
      return (x * MATRIX_HEIGHT) + (MATRIX_HEIGHT - 1 - y);
    } else {
      return (x * MATRIX_HEIGHT) + y;
    }
  } else {
    return (x * MATRIX_HEIGHT) + y;
  }
#endif
}

void MatrixDriver::setPixel(int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b) {
  int32_t idx = XY(x, y);
  if (idx >= 0 && idx < NUM_LEDS) {
    strip.setPixelColor((uint16_t)idx, strip.Color(r, g, b));
  }
}

void MatrixDriver::setPixel(int16_t x, int16_t y, uint32_t color) {
  int32_t idx = XY(x, y);
  if (idx >= 0 && idx < NUM_LEDS) {
    strip.setPixelColor((uint16_t)idx, color);
  }
}

void MatrixDriver::setPixelByIndex(uint16_t index, uint8_t r, uint8_t g, uint8_t b) {
  if (index < NUM_LEDS) {
    strip.setPixelColor(index, strip.Color(r, g, b));
  }
}

void MatrixDriver::setPixelByIndex(uint16_t index, uint32_t color) {
  if (index < NUM_LEDS) {
    strip.setPixelColor(index, color);
  }
}

uint32_t MatrixDriver::Color(uint8_t r, uint8_t g, uint8_t b) {
  return strip.Color(r, g, b);
}

void MatrixDriver::fill(uint8_t r, uint8_t g, uint8_t b) {
  strip.fill(strip.Color(r, g, b));
}

void MatrixDriver::drawImage(JsonArray pixels) {
  clear();
  size_t count = pixels.size();
  if (count > NUM_LEDS) count = NUM_LEDS;

  for (size_t i = 0; i < count; i++) {
    uint8_t x = i % MATRIX_WIDTH;
    uint8_t y = i / MATRIX_WIDTH;

    JsonArray rgb = pixels[i].as<JsonArray>();
    if (rgb.size() >= 3) {
      uint8_t r = rgb[0].as<uint8_t>();
      uint8_t g = rgb[1].as<uint8_t>();
      uint8_t b = rgb[2].as<uint8_t>();
      setPixel(x, y, r, g, b);
    }
  }
  show();
  currentMode = MODE_IMAGE;
}

// -------------------------------------------------------------------------
// Draw Character across all 4 font profiles
// -------------------------------------------------------------------------
int8_t MatrixDriver::drawChar(int16_t x, int16_t y, char c, TextFont font, uint32_t color, uint32_t bgColor) {
  // 1. Digital Clock Font (Digits, ':', '-')
  if (font == FONT_DIGITAL) {
    uint8_t digIndex = 255;
    if (c >= '0' && c <= '9') digIndex = c - '0';
    else if (c == ':') digIndex = 10;
    else if (c == '-') digIndex = 11;

    if (digIndex != 255) {
      uint16_t offset = digIndex * 4;
      for (int8_t col = 0; col < 4; col++) {
        uint8_t bits = pgm_read_byte(&fontDigital[offset + col]);
        for (int8_t row = 0; row < 7; row++) {
          if (bits & (1 << row)) {
            setPixel(x + col, y + row, color);
          } else if (bgColor != 0) {
            setPixel(x + col, y + row, bgColor);
          }
        }
      }
      return 5; // 4 width + 1 spacing
    }
    // For non-digits in digital font, fall back smoothly to 5x7!
  }

  // 2. Compact Mini 3x5 Font
  if (font == FONT_MINI) {
    char mc = c;
    if (mc >= 'a' && mc <= 'z') mc -= 32; // Uppercase for 3x5
    if (mc < 32 || mc > 'Z') mc = ' ';
    uint16_t offset = (mc - 32) * 3;

    for (int8_t col = 0; col < 3; col++) {
      uint8_t bits = pgm_read_byte(&font3x5[offset + col]);
      for (int8_t row = 0; row < 5; row++) {
        if (bits & (1 << row)) {
          setPixel(x + col, y + row + 2, color); // Offset +2 to center in 10-row matrix
        } else if (bgColor != 0) {
          setPixel(x + col, y + row + 2, bgColor);
        }
      }
    }
    return 4; // 3 width + 1 spacing
  }

  // 3. Cyber Bold Font (Thickened 5x7)
  if (font == FONT_BOLD) {
    if (c < 32 || c > 126) c = ' ';
    uint16_t offset = (c - 32) * 5;

    for (int8_t col = 0; col < 5; col++) {
      uint8_t bits = pgm_read_byte(&font5x7[offset + col]);
      for (int8_t row = 0; row < 7; row++) {
        if (bits & (1 << row)) {
          setPixel(x + col, y + row, color);
          setPixel(x + col + 1, y + row, color);     // Horizontal bold
          setPixel(x + col, y + row + 1, color);     // Vertical bold
        } else if (bgColor != 0) {
          setPixel(x + col, y + row, bgColor);
        }
      }
    }
    return 7; // 6 width + 1 spacing
  }

  // 4. Standard 5x7 Font (ASCII 32 to 126 including all lowercase)
  if (c < 32 || c > 126) c = ' ';
  uint16_t offset = (c - 32) * 5;

  for (int8_t col = 0; col < 5; col++) {
    uint8_t bits = pgm_read_byte(&font5x7[offset + col]);
    for (int8_t row = 0; row < 7; row++) {
      if (bits & (1 << row)) {
        setPixel(x + col, y + row, color);
      } else if (bgColor != 0) {
        setPixel(x + col, y + row, bgColor);
      }
    }
  }
  return 6; // 5 width + 1 spacing
}

int16_t MatrixDriver::calculateTextWidth(const String& text, TextFont font) {
  int16_t w = 0;
  for (size_t i = 0; i < text.length(); i++) {
    char c = text[i];
    if (font == FONT_MINI) {
      w += 4;
    } else if (font == FONT_BOLD) {
      w += 7;
    } else if (font == FONT_DIGITAL) {
      if ((c >= '0' && c <= '9') || c == ':' || c == '-') w += 5;
      else w += 6;
    } else {
      w += 6;
    }
  }
  return w;
}

void MatrixDriver::drawString(int16_t x, int16_t y, const String& text, TextFont font, uint32_t color, uint32_t bgColor) {
  int16_t curX = x;
  for (size_t i = 0; i < text.length(); i++) {
    int8_t advance = drawChar(curX, y, text[i], font, color, bgColor);
    curX += advance;
  }
}

void MatrixDriver::configureText(const String& text, uint32_t color, uint32_t bgColor,
                                 uint16_t speedMs, TextScrollMode mode, int8_t yOffset, TextFont font) {
  currentText = text;
  textColor = color;
  textBgColor = bgColor;
  textSpeedMs = speedMs;
  scrollMode = mode;
  textYOffset = yOffset;
  textFont = font;
  textPixelWidth = calculateTextWidth(text, font);
  lastTextStepTime = millis();
  lastBlinkTime = millis();
  blinkState = true;

  if (mode == SCROLL_LEFT) {
    scrollX = MATRIX_WIDTH;
  } else if (mode == SCROLL_RIGHT) {
    // Start at left edge (0) so text is immediately visible moving rightwards!
    scrollX = 0;
  } else if (mode == TEXT_STATIC || mode == TEXT_BLINK) {
    if (textPixelWidth < MATRIX_WIDTH) {
      scrollX = (MATRIX_WIDTH - textPixelWidth) / 2;
    } else {
      scrollX = 0;
    }
  } else if (mode == TEXT_BOUNCE) {
    scrollX = 0;
    scrollDirection = (textPixelWidth > MATRIX_WIDTH) ? -1 : 1;
  }

  currentMode = MODE_TEXT;
  clear();
  drawString(scrollX, textYOffset, currentText, textFont, textColor, textBgColor);
  show();
}

void MatrixDriver::updateText(uint32_t now) {
  if (currentMode != MODE_TEXT) return;

  if (scrollMode == TEXT_STATIC) {
    return;
  }

  if (scrollMode == TEXT_BLINK) {
    if (now - lastBlinkTime >= (textSpeedMs * 5)) {
      lastBlinkTime = now;
      blinkState = !blinkState;
      clear();
      if (blinkState) {
        drawString(scrollX, textYOffset, currentText, textFont, textColor, textBgColor);
      }
      show();
    }
    return;
  }

  // Scrolling & Bounce
  if (now - lastTextStepTime >= textSpeedMs) {
    lastTextStepTime = now;

    if (scrollMode == SCROLL_LEFT) {
      scrollX--;
      if (scrollX < -textPixelWidth) {
        scrollX = MATRIX_WIDTH;
      }
    } else if (scrollMode == SCROLL_RIGHT) {
      scrollX++;
      if (scrollX > MATRIX_WIDTH) {
        scrollX = -6;
      }
    } else if (scrollMode == TEXT_BOUNCE) {
      if (textPixelWidth <= MATRIX_WIDTH) {
        scrollX += scrollDirection;
        if (scrollX >= (MATRIX_WIDTH - textPixelWidth)) {
          scrollX = MATRIX_WIDTH - textPixelWidth;
          scrollDirection = -1;
        } else if (scrollX <= 0) {
          scrollX = 0;
          scrollDirection = 1;
        }
      } else {
        scrollX += scrollDirection;
        if (scrollX <= (MATRIX_WIDTH - textPixelWidth)) {
          scrollX = MATRIX_WIDTH - textPixelWidth;
          scrollDirection = 1;
        } else if (scrollX >= 0) {
          scrollX = 0;
          scrollDirection = -1;
        }
      }
    }

    clear();
    drawString(scrollX, textYOffset, currentText, textFont, textColor, textBgColor);
    show();
  }
}

String MatrixDriver::getModeString() const {
  switch (currentMode) {
    case MODE_IDLE: return "idle";
    case MODE_TEXT: return "text";
    case MODE_IMAGE: return "image";
    case MODE_ANIMATION: return "animation";
    default: return "unknown";
  }
}

MatrixDriver matrix;
