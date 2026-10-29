/**
 * Matrix Studio - ESP8266 NodeMCU Single-File Edition
 * - Compatible with NodeMCU v2 / v3, Wemos D1 Mini, and all ESP8266 boards
 * - 4 Fonts: Standard 5x7 (Full ASCII with lowercase), Cyber Bold, Compact Mini, Digital Clock
 * - 5 Text Modes: Scroll Left, Scroll Right, Static Centered, Flash / Blink, Bounce
 * - 6 Animations: Rainbow Wave, Matrix Rain, Cyber Flame, Color Pulse, Starfield, Scanning Wipe
 * - BearSSL HTTPS Keep-Alive Polling with Buffer Optimization for ESP8266 RAM
 * - Non-blocking Single-Core Cooperative Engine (WDT Safe with yield)
 * - Onboard Flash EEPROM Persistence (Auto-saves and resumes across disconnects & power loss)
 */

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include <EEPROM.h>

// =========================================================================
// Wi-Fi & Backend Configuration
// =========================================================================
const char* WIFI_SSID     = "vision";
const char* WIFI_PASSWORD = "987654321";

const char* BACKEND_BASE_URL = "https://matrixstudio.onrender.com";
const char* ENDPOINT_POLL    = "https://matrixstudio.onrender.com/api/device/poll";

// =========================================================================
// Hardware Configuration (NodeMCU ESP8266)
// D2 on NodeMCU maps to GPIO 4 (Standard WS2812 Data Pin)
// =========================================================================
#ifndef D2
#define D2 4
#endif

#define LED_PIN           D2       // GPIO 4 (Pin D2 on NodeMCU)
#define MATRIX_WIDTH      30       // 30 columns
#define MATRIX_HEIGHT     10       // 10 rows
#define NUM_LEDS          (MATRIX_WIDTH * MATRIX_HEIGHT) // 300 LEDs
#define SERPENTINE_LAYOUT true

#define SAFE_BRIGHTNESS   80       // Safe power level for ESP8266

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// =========================================================================
// Font 1: Standard 5x7 ASCII (Complete 32 to 126 including all lowercase)
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
  0x18, 0xA4, 0xA4, 0xA4, 0x7C, // 103 'g'
  0x7F, 0x08, 0x04, 0x04, 0x78, // 104 'h'
  0x00, 0x44, 0x7D, 0x40, 0x00, // 105 'i'
  0x40, 0x80, 0x84, 0x7D, 0x00, // 106 'j'
  0x7F, 0x10, 0x28, 0x44, 0x00, // 107 'k'
  0x00, 0x41, 0x7F, 0x40, 0x00, // 108 'l'
  0x7C, 0x04, 0x18, 0x04, 0x78, // 109 'm'
  0x7C, 0x08, 0x04, 0x04, 0x78, // 110 'n'
  0x38, 0x44, 0x44, 0x44, 0x38, // 111 'o'
  0xFC, 0x24, 0x24, 0x24, 0x18, // 112 'p'
  0x18, 0x24, 0x24, 0x18, 0xFC, // 113 'q'
  0x7C, 0x08, 0x04, 0x04, 0x08, // 114 'r'
  0x48, 0x54, 0x54, 0x54, 0x20, // 115 's'
  0x04, 0x3F, 0x44, 0x40, 0x20, // 116 't'
  0x3C, 0x40, 0x40, 0x20, 0x7C, // 117 'u'
  0x1C, 0x20, 0x40, 0x20, 0x1C, // 118 'v'
  0x3C, 0x40, 0x30, 0x40, 0x3C, // 119 'w'
  0x44, 0x28, 0x10, 0x28, 0x44, // 120 'x'
  0x1C, 0xA0, 0xA0, 0xA0, 0x7C, // 121 'y'
  0x44, 0x64, 0x54, 0x4C, 0x44, // 122 'z'
  0x00, 0x08, 0x36, 0x41, 0x00, // 123 '{'
  0x00, 0x00, 0x77, 0x00, 0x00, // 124 '|'
  0x00, 0x41, 0x36, 0x08, 0x00, // 125 '}'
  0x08, 0x04, 0x08, 0x10, 0x08  // 126 '~'
};

// =========================================================================
// Font 2: Compact Mini 3x5
// =========================================================================
static const uint8_t font3x5[] PROGMEM = {
  0x00, 0x00, 0x00, // ' '
  0x00, 0x17, 0x00, // '!'
  0x03, 0x00, 0x03, // '"'
  0x1F, 0x0A, 0x1F, // '#'
  0x12, 0x1F, 0x09, // '$'
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
// Font 3: Digital Clock 4x7 (7-Segment style)
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

// =========================================================================
// Active State Variables
// =========================================================================
static String currentMode = "text";
static String currentText = "MATRIX STUDIO";
static String currentFont = "standard";
static String currentScrollMode = "scroll_left";
static uint32_t textColor = 0x00F0FF;
static uint32_t textBgColor = 0x000000;
static uint16_t textSpeed = 50;
static int8_t textYOffset = 1;
static int16_t scrollX = MATRIX_WIDTH;
static int16_t textTotalWidth = 0;
static int8_t bounceDir = 1;
static bool blinkVisible = true;
static uint32_t lastBlinkToggle = 0;

static String currentAnimation = "rainbow";
static uint16_t animSpeed = 40;
static uint32_t animStep = 0;
static uint32_t animColor1 = 0x00F0FF;
static uint32_t animColor2 = 0xFF007F;

static int8_t rainPos[MATRIX_WIDTH];
static uint8_t rainLength[MATRIX_WIDTH];
static uint8_t rainSpeed[MATRIX_WIDTH];
static uint8_t fireHeat[MATRIX_WIDTH][MATRIX_HEIGHT];

static uint32_t pendingImagePixels[NUM_LEDS];
static bool mirrorX = false;
static bool mirrorY = false;

static uint32_t lastAnimTick = 0;
static String lastExecutedId = "";

// =========================================================================
// Coordinate Mapping (Serpentine + Universal Mirroring)
// =========================================================================
inline int32_t xyToIndex(int16_t x, int16_t y) {
  if (x < 0 || x >= MATRIX_WIDTH || y < 0 || y >= MATRIX_HEIGHT) return -1;

  if (mirrorX) x = (MATRIX_WIDTH - 1) - x;
  if (mirrorY) y = (MATRIX_HEIGHT - 1) - y;

  if (SERPENTINE_LAYOUT) {
    if (y % 2 == 0) return (y * MATRIX_WIDTH) + x;
    else return (y * MATRIX_WIDTH) + (MATRIX_WIDTH - 1 - x);
  } else {
    return (y * MATRIX_WIDTH) + x;
  }
}

inline void setPixel(int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b) {
  int32_t idx = xyToIndex(x, y);
  if (idx >= 0 && idx < NUM_LEDS) {
    strip.setPixelColor(idx, strip.Color(r, g, b));
  }
}

inline void setPixel(int16_t x, int16_t y, uint32_t c) {
  int32_t idx = xyToIndex(x, y);
  if (idx >= 0 && idx < NUM_LEDS) {
    strip.setPixelColor(idx, c);
  }
}

// WS2812B Reset Latch Safeguard (>300µs silence)
inline void showStrip() {
  delayMicroseconds(350);
  strip.show();
}

// =========================================================================
// Glyph Renderers with Clean Character Spacing Isolation
// =========================================================================
int8_t drawChar(int16_t x, int16_t y, char c, const String& font, uint32_t col, uint32_t bg) {
  if (font == "digital") {
    uint8_t digIndex = 255;
    if (c >= '0' && c <= '9') digIndex = c - '0';
    else if (c == ':') digIndex = 10;
    else if (c == '-') digIndex = 11;

    if (digIndex != 255) {
      uint16_t offset = digIndex * 4;
      for (int8_t colIdx = 0; colIdx < 4; colIdx++) {
        uint8_t bits = pgm_read_byte(&fontDigital[offset + colIdx]);
        for (int8_t row = 0; row < 7; row++) {
          if (bits & (1 << row)) setPixel(x + colIdx, y + row, col);
          else if (bg != 0) setPixel(x + colIdx, y + row, bg);
        }
      }
      for (int8_t row = 0; row < 7; row++) setPixel(x + 4, y + row, bg);
      return 5;
    } else if (c == ' ') {
      for (int8_t colIdx = 0; colIdx < 4; colIdx++) {
        for (int8_t row = 0; row < 7; row++) setPixel(x + colIdx, y + row, bg);
      }
      return 4;
    }
  }

  if (font == "mini") {
    char mc = c;
    if (mc >= 'a' && mc <= 'z') mc -= 32;
    if (mc < 32 || mc > 'Z') mc = ' ';
    uint16_t offset = (mc - 32) * 3;

    for (int8_t colIdx = 0; colIdx < 3; colIdx++) {
      uint8_t bits = pgm_read_byte(&font3x5[offset + colIdx]);
      for (int8_t row = 0; row < 5; row++) {
        if (bits & (1 << row)) setPixel(x + colIdx, y + row + 2, col);
        else if (bg != 0) setPixel(x + colIdx, y + row + 2, bg);
      }
    }
    for (int8_t row = 0; row < 7; row++) setPixel(x + 3, y + row, bg);
    return 4;
  }

  if (font == "bold") {
    if (c < 32 || c > 126) c = ' ';
    uint16_t offset = (c - 32) * 5;

    for (int8_t colIdx = 0; colIdx < 5; colIdx++) {
      uint8_t bits = pgm_read_byte(&font5x7[offset + colIdx]);
      for (int8_t row = 0; row < 7; row++) {
        if (bits & (1 << row)) {
          setPixel(x + colIdx, y + row, col);
          if (colIdx < 4) setPixel(x + colIdx + 1, y + row, col);
        } else if (bg != 0) {
          setPixel(x + colIdx, y + row, bg);
        }
      }
    }
    for (int8_t row = 0; row < 7; row++) setPixel(x + 5, y + row, bg);
    return 6;
  }

  // Standard 5x7 Font
  if (c < 32 || c > 126) c = ' ';
  uint16_t offset = (c - 32) * 5;

  for (int8_t colIdx = 0; colIdx < 5; colIdx++) {
    uint8_t bits = pgm_read_byte(&font5x7[offset + colIdx]);
    for (int8_t row = 0; row < 7; row++) {
      if (bits & (1 << row)) setPixel(x + colIdx, y + row, col);
      else if (bg != 0) setPixel(x + colIdx, y + row, bg);
    }
  }
  for (int8_t row = 0; row < 7; row++) setPixel(x + 5, y + row, bg);
  return 6;
}

int16_t calculateTextWidth(const String& txt, const String& font) {
  int16_t w = 0;
  for (size_t i = 0; i < txt.length(); i++) {
    if (font == "mini") w += 4;
    else if (font == "bold") w += 6;
    else if (font == "digital" && ((txt[i] >= '0' && txt[i] <= '9') || txt[i] == ':' || txt[i] == '-')) w += 5;
    else w += 6;
  }
  return w;
}

void renderString(int16_t startX, int16_t startY, const String& txt, const String& font, uint32_t col, uint32_t bg) {
  int16_t curX = startX;
  for (size_t i = 0; i < txt.length(); i++) {
    int8_t advance = drawChar(curX, startY, txt[i], font, col, bg);
    curX += advance;
  }
}

// =========================================================================
// Color Helpers & Wheel
// =========================================================================
uint32_t parseColor(JsonVariant v, uint32_t defaultColor) {
  if (v.isNull()) return defaultColor;
  if (v.is<JsonArray>()) {
    JsonArray arr = v.as<JsonArray>();
    if (arr.size() >= 3) return strip.Color(arr[0].as<uint8_t>(), arr[1].as<uint8_t>(), arr[2].as<uint8_t>());
  }
  if (v.is<const char*>()) {
    const char* str = v.as<const char*>();
    if (str[0] == '#') str++;
    long num = strtol(str, NULL, 16);
    return (uint32_t)num;
  }
  return defaultColor;
}

uint32_t colorWheel(uint8_t pos) {
  pos = 255 - pos;
  if (pos < 85) return strip.Color(255 - pos * 3, 0, pos * 3);
  if (pos < 170) {
    pos -= 85;
    return strip.Color(0, pos * 3, 255 - pos * 3);
  }
  pos -= 170;
  return strip.Color(pos * 3, 255 - pos * 3, 0);
}

// =========================================================================
// Animation Renderers
// =========================================================================
void renderMatrixRain() {
  strip.clear();
  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    uint8_t spd = rainSpeed[x] > 0 ? rainSpeed[x] : 1;
    if (animStep % spd == 0) {
      rainPos[x]++;
      if (rainPos[x] - rainLength[x] >= MATRIX_HEIGHT) {
        rainPos[x] = 0;
        rainLength[x] = 2 + (rand() % 4);
        rainSpeed[x] = 1 + (rand() % 2);
      }
    }

    int8_t head = rainPos[x];
    for (int8_t i = 0; i < rainLength[x]; i++) {
      int8_t y = head - i;
      if (y >= 0 && y < MATRIX_HEIGHT) {
        if (i == 0) setPixel(x, y, 220, 255, 240);
        else {
          float factor = 1.0f - ((float)i / rainLength[x]);
          uint8_t r = ((animColor1 >> 16) & 0xFF) * factor;
          uint8_t g = ((animColor1 >> 8) & 0xFF) * factor;
          uint8_t b = (animColor1 & 0xFF) * factor;
          setPixel(x, y, r, g, b);
        }
      }
    }
  }
  showStrip();
}

void renderFire() {
  for (int x = 0; x < MATRIX_WIDTH; x++) {
    for (int y = 0; y < MATRIX_HEIGHT; y++) {
      int cooling = (rand() % 4) + 1;
      if (cooling > fireHeat[x][y]) fireHeat[x][y] = 0;
      else fireHeat[x][y] -= cooling;
    }
  }
  for (int y = 0; y < MATRIX_HEIGHT - 1; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      int left = (x > 0) ? x - 1 : MATRIX_WIDTH - 1;
      int right = (x < MATRIX_WIDTH - 1) ? x + 1 : 0;
      fireHeat[x][y] = (fireHeat[left][y + 1] + fireHeat[x][y + 1] + fireHeat[right][y + 1]) / 3;
    }
  }
  for (int x = 0; x < MATRIX_WIDTH; x++) {
    if ((rand() % 100) < 70) fireHeat[x][MATRIX_HEIGHT - 1] = 150 + (rand() % 90);
  }
  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
      uint8_t t = fireHeat[x][y];
      uint8_t r = 0, g = 0, b = 0;
      if (t > 180) {
        r = 255; g = 200 + ((t - 180) * 55 / 75); b = (t - 180) * 180 / 75;
      } else if (t > 90) {
        r = 255; g = (t - 90) * 200 / 90; b = 0;
      } else if (t > 20) {
        r = (t - 20) * 255 / 70; g = 0; b = 0;
      }
      setPixel(x, y, r, g, b);
    }
  }
  showStrip();
}

void renderPulse() {
  float angle = (animStep % 100) * (2.0f * 3.14159f / 100.0f);
  float blend = (sin(angle) + 1.0f) / 2.0f;
  uint8_t r = ((animColor1 >> 16) & 0xFF) * (1.0f - blend) + ((animColor2 >> 16) & 0xFF) * blend;
  uint8_t g = ((animColor1 >> 8) & 0xFF) * (1.0f - blend) + ((animColor2 >> 8) & 0xFF) * blend;
  uint8_t b = (animColor1 & 0xFF) * (1.0f - blend) + (animColor2 & 0xFF) * blend;
  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
  showStrip();
}

void renderStarfield() {
  strip.clear();
  for (int s = 0; s < 7; s++) {
    uint8_t x = rand() % MATRIX_WIDTH;
    uint8_t y = rand() % MATRIX_HEIGHT;
    uint32_t c = (rand() % 2 == 0) ? animColor1 : animColor2;
    setPixel(x, y, c);
  }
  showStrip();
}

void renderColorWipe() {
  strip.clear();
  uint8_t col = (animStep / 2) % MATRIX_WIDTH;
  bool toggle = ((animStep / (2 * MATRIX_WIDTH)) % 2) == 0;
  uint32_t color = toggle ? animColor1 : animColor2;
  for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
    setPixel(col, y, color);
  }
  showStrip();
}

void renderRainbow() {
  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, colorWheel((i * 256 / NUM_LEDS + animStep * 2) & 255));
  }
  showStrip();
}

// =========================================================================
// EEPROM Persistent Storage (Survives power cuts & disconnects)
// =========================================================================
#define EEPROM_MAGIC 0x4D53 // "MS"

struct PersistentConfig {
  uint16_t magic;
  char mode[12];
  char text[64];
  char font[12];
  char scrollMode[16];
  uint32_t textColor;
  uint32_t textBgColor;
  uint16_t textSpeed;
  int8_t textYOffset;
  char animName[16];
  uint16_t animSpeed;
  uint32_t animColor1;
  uint32_t animColor2;
  bool mirrorX;
  bool mirrorY;
  uint8_t brightness;
};

void saveStateToEEPROM() {
  PersistentConfig cfg;
  cfg.magic = EEPROM_MAGIC;
  strncpy(cfg.mode, currentMode.c_str(), sizeof(cfg.mode) - 1);
  strncpy(cfg.text, currentText.c_str(), sizeof(cfg.text) - 1);
  strncpy(cfg.font, currentFont.c_str(), sizeof(cfg.font) - 1);
  strncpy(cfg.scrollMode, currentScrollMode.c_str(), sizeof(cfg.scrollMode) - 1);
  cfg.textColor = textColor;
  cfg.textBgColor = textBgColor;
  cfg.textSpeed = textSpeed;
  cfg.textYOffset = textYOffset;
  strncpy(cfg.animName, currentAnimation.c_str(), sizeof(cfg.animName) - 1);
  cfg.animSpeed = animSpeed;
  cfg.animColor1 = animColor1;
  cfg.animColor2 = animColor2;
  cfg.mirrorX = mirrorX;
  cfg.mirrorY = mirrorY;
  cfg.brightness = strip.getBrightness();

  EEPROM.put(0, cfg);
  EEPROM.commit();
  Serial.printf("  💾 Saved active state [%s] to ESP8266 EEPROM\n", currentMode.c_str());
}

void loadStateFromEEPROM() {
  PersistentConfig cfg;
  EEPROM.get(0, cfg);

  if (cfg.magic == EEPROM_MAGIC) {
    currentMode = String(cfg.mode);
    currentText = String(cfg.text);
    currentFont = String(cfg.font);
    currentScrollMode = String(cfg.scrollMode);
    textColor = cfg.textColor;
    textBgColor = cfg.textBgColor;
    textSpeed = cfg.textSpeed;
    textYOffset = cfg.textYOffset;
    currentAnimation = String(cfg.animName);
    animSpeed = cfg.animSpeed;
    animColor1 = cfg.animColor1;
    animColor2 = cfg.animColor2;
    mirrorX = cfg.mirrorX;
    mirrorY = cfg.mirrorY;
    if (cfg.brightness > 0 && cfg.brightness <= 180) {
      strip.setBrightness(cfg.brightness);
    }
    Serial.printf("  📂 Loaded saved state from EEPROM: %s (%s)\n", currentMode.c_str(), currentText.c_str());
  } else {
    Serial.println("  ℹ️ No saved EEPROM state found. Using defaults.");
  }
}

// =========================================================================
// Command Applicator
// =========================================================================
void applyCommand(const String& type, JsonObject params) {
  if (params.containsKey("mirrorX")) mirrorX = params["mirrorX"].as<bool>();
  if (params.containsKey("mirrorY")) mirrorY = params["mirrorY"].as<bool>();

  if (type == "mirror") {
    saveStateToEEPROM();
    return;
  }

  currentMode = type;
  strip.clear();

  if (currentMode == "text") {
    currentText = params["text"].as<String>();
    currentFont = params["font"].as<String>();
    if (currentFont.isEmpty()) currentFont = "standard";
    currentScrollMode = params["mode"].as<String>();
    if (currentScrollMode.isEmpty()) currentScrollMode = "scroll_left";
    textColor = parseColor(params["color"], 0x00F0FF);
    textBgColor = parseColor(params["bgColor"], 0x000000);
    textSpeed = params["speed"].as<uint16_t>();
    if (textSpeed < 20) textSpeed = 40;
    textYOffset = params.containsKey("yOffset") ? params["yOffset"].as<int8_t>() : 1;

    textTotalWidth = calculateTextWidth(currentText, currentFont);

    if (currentScrollMode == "scroll_left") {
      scrollX = MATRIX_WIDTH;
    } else if (currentScrollMode == "scroll_right") {
      scrollX = 0;
    } else if (currentScrollMode == "static" || currentScrollMode == "blink") {
      scrollX = (textTotalWidth < MATRIX_WIDTH) ? (MATRIX_WIDTH - textTotalWidth) / 2 : 0;
    } else if (currentScrollMode == "bounce") {
      scrollX = 0;
      bounceDir = (textTotalWidth > MATRIX_WIDTH) ? -1 : 1;
    }

    blinkVisible = true;
    lastBlinkToggle = millis();
    strip.clear();
    renderString(scrollX, textYOffset, currentText, currentFont, textColor, textBgColor);
    showStrip();
  }
  else if (currentMode == "animation") {
    currentAnimation = params["name"].as<String>();
    animSpeed = params["speed"].as<uint16_t>();
    if (animSpeed < 15) animSpeed = 35;
    animColor1 = parseColor(params["primaryColor"], 0x00F0FF);
    animColor2 = parseColor(params["secondaryColor"], 0xFF007F);
    animStep = 0;
    memset(fireHeat, 0, sizeof(fireHeat));
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      rainPos[x] = -(rand() % MATRIX_HEIGHT);
      rainLength[x] = 2 + (rand() % 4);
      rainSpeed[x] = 1 + (rand() % 2);
    }
  }
  else if (currentMode == "image") {
    if (params.containsKey("pixels")) {
      JsonArray pxArr = params["pixels"].as<JsonArray>();
      size_t count = pxArr.size();
      if (count > NUM_LEDS) count = NUM_LEDS;
      strip.clear();
      for (size_t i = 0; i < count; i++) {
        JsonArray rgb = pxArr[i].as<JsonArray>();
        if (rgb.size() >= 3) {
          uint8_t x = i % MATRIX_WIDTH;
          uint8_t y = i / MATRIX_WIDTH;
          setPixel(x, y, rgb[0].as<uint8_t>(), rgb[1].as<uint8_t>(), rgb[2].as<uint8_t>());
        }
      }
      showStrip();
    }
  }
  else if (currentMode == "brightness") {
    uint8_t b = SAFE_BRIGHTNESS;
    if (params.containsKey("value")) b = params["value"].as<uint8_t>();
    else if (params.containsKey("brightness")) b = params["brightness"].as<uint8_t>();
    if (b > 180) b = 180;
    strip.setBrightness(b);
    showStrip();
  }
  else if (currentMode == "clear") {
    strip.clear();
    showStrip();
  }

  saveStateToEEPROM();
}

// =========================================================================
// Active Animation Loop (Executed smoothly every frame)
// =========================================================================
void updateActiveLoop() {
  uint32_t now = millis();

  if (currentMode == "text") {
    if (currentScrollMode == "static") return;

    if (currentScrollMode == "blink") {
      if (now - lastBlinkToggle >= (textSpeed * 6)) {
        lastBlinkToggle = now;
        blinkVisible = !blinkVisible;
        strip.clear();
        if (blinkVisible) {
          renderString(scrollX, textYOffset, currentText, currentFont, textColor, textBgColor);
        }
        showStrip();
      }
      return;
    }

    if (now - lastAnimTick >= textSpeed) {
      lastAnimTick = now;

      if (currentScrollMode == "scroll_left") {
        scrollX--;
        if (scrollX < -textTotalWidth) scrollX = MATRIX_WIDTH;
      }
      else if (currentScrollMode == "scroll_right") {
        scrollX++;
        if (scrollX > MATRIX_WIDTH) scrollX = -6;
      }
      else if (currentScrollMode == "bounce") {
        if (textTotalWidth <= MATRIX_WIDTH) {
          scrollX += bounceDir;
          if (scrollX >= (MATRIX_WIDTH - textTotalWidth)) {
            scrollX = MATRIX_WIDTH - textTotalWidth;
            bounceDir = -1;
          } else if (scrollX <= 0) {
            scrollX = 0;
            bounceDir = 1;
          }
        } else {
          scrollX += bounceDir;
          if (scrollX <= (MATRIX_WIDTH - textTotalWidth)) {
            scrollX = MATRIX_WIDTH - textTotalWidth;
            bounceDir = 1;
          } else if (scrollX >= 0) {
            scrollX = 0;
            bounceDir = -1;
          }
        }
      }

      strip.clear();
      renderString(scrollX, textYOffset, currentText, currentFont, textColor, textBgColor);
      showStrip();
    }
  }
  else if (currentMode == "animation") {
    if (now - lastAnimTick >= animSpeed) {
      lastAnimTick = now;
      animStep++;

      if (currentAnimation == "matrix_rain") renderMatrixRain();
      else if (currentAnimation == "fire") renderFire();
      else if (currentAnimation == "pulse") renderPulse();
      else if (currentAnimation == "starfield") renderStarfield();
      else if (currentAnimation == "color_wipe") renderColorWipe();
      else renderRainbow();
    }
  }
}

// =========================================================================
// Network Poller (Optimized BearSSL for ESP8266 RAM)
// =========================================================================
static uint32_t lastNetworkPoll = 0;
const uint32_t POLL_INTERVAL_MS = 2500;

void pollNetwork() {
  uint32_t now = millis();
  if (now - lastNetworkPoll < POLL_INTERVAL_MS) return;
  lastNetworkPoll = now;

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  // Create lightweight BearSSL client with reduced buffers for ESP8266 RAM stability
  WiFiClientSecure secClient;
  secClient.setInsecure();
  secClient.setBufferSizes(1024, 512); // Saves 10KB RAM on ESP8266
  secClient.setTimeout(4000);

  HTTPClient http;
  http.setReuse(false);

  String url = String(ENDPOINT_POLL) + 
               "?lastId=" + lastExecutedId + 
               "&rssi=" + String(WiFi.RSSI()) + 
               "&uptime=" + String(millis() / 1000) + 
               "&ip=" + WiFi.localIP().toString();

  if (http.begin(secClient, url)) {
    http.setTimeout(4500);
    int code = http.GET();

    if (code == HTTP_CODE_OK) {
      String body = http.getString();

      // Fast check: exit immediately if no new command
      if (body.indexOf("\"hasCommand\":true") != -1) {
        DynamicJsonDocument doc(4096);
        DeserializationError err = deserializeJson(doc, body);

        if (!err && doc["hasCommand"].as<bool>()) {
          JsonObject cmd = doc["command"];
          String cmdId = cmd["id"].as<String>();

          if (cmdId != lastExecutedId) {
            String type = cmd["type"].as<String>();
            JsonObject params = cmd["params"];
            if (params.isNull()) params = cmd["payload"];

            applyCommand(type, params);
            lastExecutedId = cmdId;
          }
        } else {
          int idIdx = body.indexOf("\"id\":\"");
          if (idIdx != -1) {
            int endIdx = body.indexOf("\"", idIdx + 6);
            if (endIdx != -1) {
              lastExecutedId = body.substring(idIdx + 6, endIdx);
            }
          }
        }
      }
    }
    http.end();
  }
  secClient.stop();
}

// =========================================================================
// Setup
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("\n==========================================");
  Serial.println("🚀 Matrix Studio ESP8266 NodeMCU Engine");
  Serial.println("==========================================");

  EEPROM.begin(512);

  strip.begin();
  strip.setBrightness(SAFE_BRIGHTNESS);
  strip.clear();
  showStrip();

  // Fast boot splash
  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
      setPixel(x, y, 0, 240, 255);
    }
    showStrip();
    delay(5);
    strip.clear();
  }
  showStrip();

  // Load saved state immediately (runs even without Wi-Fi!)
  loadStateFromEEPROM();
  textTotalWidth = calculateTextWidth(currentText, currentFont);
  if (currentMode == "text") {
    strip.clear();
    renderString(scrollX, textYOffset, currentText, currentFont, textColor, textBgColor);
    showStrip();
  }

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttempt < 6000)) {
    delay(200);
    Serial.print(".");
    yield();
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ Wi-Fi Connected!");
    Serial.print("  NodeMCU IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("⚠️ Wi-Fi connecting in background. Active effect is already running!");
  }
}

// =========================================================================
// Main Loop (Non-blocking Single-Core Engine)
// =========================================================================
void loop() {
  // 1. Run the active LED effect
  updateActiveLoop();

  // 2. Poll the Render backend for commands (non-blocking)
  pollNetwork();

  // 3. Yield CPU to prevent ESP8266 Watchdog (WDT) reset
  yield();
}
