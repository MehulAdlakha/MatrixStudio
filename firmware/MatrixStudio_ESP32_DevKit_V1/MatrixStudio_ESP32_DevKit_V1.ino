/**
 * Matrix Studio - DOIT ESP32 DevKit V1 Dedicated Edition
 * - Board: DOIT ESP32 DEVKIT V1 (30-pin & 36-pin versions with ESP-WROOM-32)
 * - Pin D4 (GPIO 4): 30x10 Serpentine WS2812B Data Line
 * - Pin D2 (GPIO 2): Onboard Blue LED Wi-Fi / Status Indicator
 * - 4 Fonts: Standard 5x7 (Full ASCII with lowercase), Cyber Bold, Compact Mini, Digital Clock
 * - 5 Text Modes: Scroll Left, Scroll Right, Static Centered, Flash / Blink, Bounce
 * - 6 Animations: Rainbow Wave, Matrix Rain, Cyber Flame, Color Pulse, Starfield, Scanning Wipe
 * - Zero-Lag Dual-Core Architecture: Core 0 Wi-Fi Network Task + Core 1 60 FPS Render Engine
 * - Anti-Glitch Safe Brightness (100) & Power Stability
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>

// =========================================================================
// Wi-Fi & Backend Configuration
// =========================================================================
const char* WIFI_SSID     = "vision";
const char* WIFI_PASSWORD = "987654321";

// CLOUD BACKEND (Works reliably across mobile hotspot and Wi-Fi):
const char* BACKEND_BASE_URL = "https://matrixstudio.onrender.com";
const char* ENDPOINT_POLL    = "https://matrixstudio.onrender.com/api/device/poll";
const char* ENDPOINT_ACK     = "https://matrixstudio.onrender.com/api/device/ack";
const char* ENDPOINT_STATUS  = "https://matrixstudio.onrender.com/api/device/status";

// LOCAL WI-FI (Only use if both PC and ESP32 are on the exact same Wi-Fi router):
// const char* BACKEND_BASE_URL = "http://172.22.211.5:5000";
// const char* ENDPOINT_POLL    = "http://172.22.211.5:5000/api/device/poll";
// const char* ENDPOINT_ACK     = "http://172.22.211.5:5000/api/device/ack";
// const char* ENDPOINT_STATUS  = "http://172.22.211.5:5000/api/device/status";

// =========================================================================
// Hardware Configuration: DOIT ESP32 DevKit V1 (30-pin & 36-pin)
// =========================================================================
#define BOARD_TARGET      "DOIT ESP32 DEVKIT V1"

// On DevKit V1, Matrix DIN connects to pin marked "D4" (GPIO 4)
#ifndef D4
#define D4 4
#endif
#define LED_PIN           D4       // Connect Matrix DIN wire to pin marked "D4"

// DevKit V1 Onboard Blue LED indicator on pin "D2" (GPIO 2)
#ifndef D2
#define D2 2
#endif
#define STATUS_LED_PIN    D2

#define MATRIX_WIDTH      30       // 30 columns
#define MATRIX_HEIGHT     10       // 10 rows
#define NUM_LEDS          (MATRIX_WIDTH * MATRIX_HEIGHT) // 300 LEDs
#define SERPENTINE_LAYOUT true

#define SAFE_BRIGHTNESS   100

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
Preferences prefs; // Onboard Non-Volatile Storage (NVS) engine

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
// Font 3: Compact Mini 3x5 (3 columns x 5 bits high)
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
// Font 4: Digital Clock 4x7 (7-Segment style)
// =========================================================================
static const uint8_t fontDigital[] PROGMEM = {
  // '0'-'9', ' ', ':', '-', 'A'-'Z'
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

// -------------------------------------------------------------------------
// Thread-Safe Handoff Variables (Core 0 -> Core 1)
// -------------------------------------------------------------------------
volatile bool hasNewCommand = false;
volatile uint16_t frameCount = 0;
volatile uint16_t currentFps = 0;
static uint32_t lastFpsCalcTime = 0;
static String pendingType = "";
static String pendingText = "MATRIX STUDIO";
static String pendingFont = "standard";
static String pendingMode = "scroll_left";
static uint32_t pendingColor = 0x00F0FF;
static uint32_t pendingBgColor = 0x000000;
static uint16_t pendingSpeed = 50;
static int8_t pendingYOffset = 1;
static String pendingAnimName = "rainbow";
static uint32_t pendingColor1 = 0x00F0FF;
static uint32_t pendingColor2 = 0xFF007F;
static uint8_t pendingBrightness = SAFE_BRIGHTNESS;
static uint32_t pendingImagePixels[NUM_LEDS];
static bool pendingMirrorX = false;
static bool pendingMirrorY = false;
static bool pendingHasMirrorUpdate = false;

// Universal Mirror Flags on Core 1
static bool mirrorX = false;
static bool mirrorY = false;

// Active variables on Core 1
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

static uint32_t lastAnimTick = 0;
static String lastExecutedId = "";

// -------------------------------------------------------------------------
// Coordinate Mapping (Serpentine + Universal Mirroring)
// -------------------------------------------------------------------------
inline int32_t xyToIndex(int16_t x, int16_t y) {
  if (x < 0 || x >= MATRIX_WIDTH || y < 0 || y >= MATRIX_HEIGHT) return -1;

  // Universal Hardware Mirroring (applies to text, pixel art, animations)
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

// WS2812B Reset Latch Safeguard: Guarantees >300µs silence between frames
// so intermediate pixels do not interpret false resets or shift bits downstream.
inline void showStrip() {
  delayMicroseconds(350);
  strip.show();
}

// -------------------------------------------------------------------------
// Glyph Renderers for All 4 Fonts (With Clean Spacing Isolation)
// -------------------------------------------------------------------------
int8_t drawChar(int16_t x, int16_t y, char c, const String& font, uint32_t col, uint32_t bg) {
  // 1. Digital Clock font for digits and colons
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
      // Guarantee inter-character spacing column is cleanly cleared
      for (int8_t row = 0; row < 7; row++) {
        setPixel(x + 4, y + row, bg);
      }
      return 5; // 4 width + 1 space
    } else if (c == ' ') {
      for (int8_t colIdx = 0; colIdx < 4; colIdx++) {
        for (int8_t row = 0; row < 7; row++) setPixel(x + colIdx, y + row, bg);
      }
      return 4;
    }
    // Fall back to 5x7 if letter
  }

  // 2. Compact Mini (3x5) font
  if (font == "mini") {
    char mc = c;
    if (mc >= 'a' && mc <= 'z') mc -= 32; // Uppercase
    if (mc < 32 || mc > 'Z') mc = ' ';
    uint16_t offset = (mc - 32) * 3;

    for (int8_t colIdx = 0; colIdx < 3; colIdx++) {
      uint8_t bits = pgm_read_byte(&font3x5[offset + colIdx]);
      for (int8_t row = 0; row < 5; row++) {
        if (bits & (1 << row)) setPixel(x + colIdx, y + row + 2, col);
        else if (bg != 0) setPixel(x + colIdx, y + row + 2, bg);
      }
    }
    // Guarantee inter-character spacing column is cleanly cleared
    for (int8_t row = 0; row < 7; row++) {
      setPixel(x + 3, y + row, bg);
    }
    return 4; // 3 width + 1 space
  }

  // 3. Cyber Bold font (5x7 thickened cleanly without bleeding into gaps or below baseline)
  if (font == "bold") {
    if (c < 32 || c > 126) c = ' ';
    uint16_t offset = (c - 32) * 5;

    for (int8_t colIdx = 0; colIdx < 5; colIdx++) {
      uint8_t bits = pgm_read_byte(&font5x7[offset + colIdx]);
      for (int8_t row = 0; row < 7; row++) {
        if (bits & (1 << row)) {
          setPixel(x + colIdx, y + row, col);
          // Bold horizontally within glyph boundary only (never bleed into spacing gap)
          if (colIdx < 4) {
            setPixel(x + colIdx + 1, y + row, col);
          }
        } else if (bg != 0) {
          setPixel(x + colIdx, y + row, bg);
        }
      }
    }
    // Guarantee inter-character spacing column is cleanly cleared
    for (int8_t row = 0; row < 7; row++) {
      setPixel(x + 5, y + row, bg);
    }
    return 6; // 5 width + 1 clean space
  }

  // 4. Standard 5x7 Font (Supports all ASCII 32 to 126!)
  if (c < 32 || c > 126) c = ' ';
  uint16_t offset = (c - 32) * 5;

  for (int8_t colIdx = 0; colIdx < 5; colIdx++) {
    uint8_t bits = pgm_read_byte(&font5x7[offset + colIdx]);
    for (int8_t row = 0; row < 7; row++) {
      if (bits & (1 << row)) setPixel(x + colIdx, y + row, col);
      else if (bg != 0) setPixel(x + colIdx, y + row, bg);
    }
  }
  // Guarantee inter-character spacing column is cleanly cleared
  for (int8_t row = 0; row < 7; row++) {
    setPixel(x + 5, y + row, bg);
  }
  return 6; // 5 width + 1 space
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

// -------------------------------------------------------------------------
// Helper: Colors & Rainbow Wheel
// -------------------------------------------------------------------------
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

uint32_t colorWheel(byte pos) {
  pos = 255 - pos;
  if (pos < 85) return strip.Color(255 - pos * 3, 0, pos * 3);
  if (pos < 170) {
    pos -= 85;
    return strip.Color(0, pos * 3, 255 - pos * 3);
  }
  pos -= 170;
  return strip.Color(pos * 3, 255 - pos * 3, 0);
}

// -------------------------------------------------------------------------
// Animation Renderers
// -------------------------------------------------------------------------
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
        if (i == 0) setPixel(x, y, 220, 255, 240); // Bright head
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

// -------------------------------------------------------------------------
// Persistent Storage: Onboard Flash Memory (NVS)
// Saves active effect so it survives power cuts, restarts, and Wi-Fi drops
// -------------------------------------------------------------------------
void saveStateToNVS() {
  prefs.begin("matrix", false);
  prefs.putString("type", currentMode);
  prefs.putBool("mirrorX", mirrorX);
  prefs.putBool("mirrorY", mirrorY);

  if (currentMode == "text") {
    prefs.putString("text", currentText);
    prefs.putString("font", currentFont);
    prefs.putString("mode", currentScrollMode);
    prefs.putUInt("color", textColor);
    prefs.putUInt("bgColor", textBgColor);
    prefs.putUShort("speed", textSpeed);
    prefs.putChar("yOffset", textYOffset);
  } else if (currentMode == "animation") {
    prefs.putString("animName", currentAnimation);
    prefs.putUShort("animSpd", animSpeed);
    prefs.putUInt("animC1", animColor1);
    prefs.putUInt("animC2", animColor2);
  } else if (currentMode == "image") {
    prefs.putBytes("pixels", pendingImagePixels, sizeof(pendingImagePixels));
  } else if (currentMode == "brightness") {
    prefs.putUChar("bright", pendingBrightness);
  }
  prefs.end();
  Serial.printf("  💾 Saved active effect [%s] to onboard Flash (survives power cuts & disconnects)\n", currentMode.c_str());
}

void loadStateFromNVS() {
  prefs.begin("matrix", true); // Read-only
  String savedType = prefs.getString("type", "text");
  mirrorX = prefs.getBool("mirrorX", false);
  mirrorY = prefs.getBool("mirrorY", false);

  uint8_t savedBright = prefs.getUChar("bright", SAFE_BRIGHTNESS);
  if (savedBright > 0 && savedBright <= 180) {
    strip.setBrightness(savedBright);
  }

  if (savedType == "text") {
    pendingType = "text";
    pendingText = prefs.getString("text", "MATRIX STUDIO");
    pendingFont = prefs.getString("font", "standard");
    pendingMode = prefs.getString("mode", "scroll_left");
    pendingColor = prefs.getUInt("color", 0x00F0FF);
    pendingBgColor = prefs.getUInt("bgColor", 0x000000);
    pendingSpeed = prefs.getUShort("speed", 50);
    pendingYOffset = prefs.getChar("yOffset", 1);
  } else if (savedType == "animation") {
    pendingType = "animation";
    pendingAnimName = prefs.getString("animName", "rainbow");
    pendingSpeed = prefs.getUShort("animSpd", 40);
    pendingColor1 = prefs.getUInt("animC1", 0x00F0FF);
    pendingColor2 = prefs.getUInt("animC2", 0xFF007F);
  } else if (savedType == "image") {
    pendingType = "image";
    size_t len = prefs.getBytes("pixels", pendingImagePixels, sizeof(pendingImagePixels));
    if (len == 0) {
      pendingType = "text";
      pendingText = "MATRIX STUDIO";
      pendingFont = "standard";
      pendingMode = "scroll_left";
      pendingColor = 0x00F0FF;
      pendingSpeed = 50;
      pendingYOffset = 1;
    }
  } else if (savedType == "brightness") {
    pendingType = "brightness";
    pendingBrightness = savedBright;
  } else if (savedType == "clear") {
    pendingType = "clear";
  } else {
    pendingType = "text";
    pendingText = "MATRIX STUDIO";
    pendingFont = "standard";
    pendingMode = "scroll_left";
    pendingColor = 0x00F0FF;
    pendingSpeed = 50;
    pendingYOffset = 1;
  }

  prefs.end();
  hasNewCommand = true;
  Serial.printf("  📂 Loaded saved state from onboard Flash: %s\n", pendingType.c_str());
}

// -------------------------------------------------------------------------
// Core 1: Execute Active Effect at Full 60 FPS
// -------------------------------------------------------------------------
void applyPendingCommand() {
  if (pendingHasMirrorUpdate) {
    mirrorX = pendingMirrorX;
    mirrorY = pendingMirrorY;
    pendingHasMirrorUpdate = false;
    Serial.printf("  🪞 Universal Mirror: X=%s, Y=%s\n", mirrorX ? "ON" : "OFF", mirrorY ? "ON" : "OFF");
    saveStateToNVS();

    if (currentMode == "image") {
      strip.clear();
      for (size_t i = 0; i < NUM_LEDS; i++) {
        uint8_t x = i % MATRIX_WIDTH;
        uint8_t y = i / MATRIX_WIDTH;
        setPixel(x, y, pendingImagePixels[i]);
      }
      showStrip();
    } else if (currentMode == "text" && (currentScrollMode == "static" || currentScrollMode == "blink")) {
      strip.clear();
      renderString(scrollX, textYOffset, currentText, currentFont, textColor, textBgColor);
      showStrip();
    }
  }

  if (pendingType == "mirror") {
    return;
  }

  currentMode = pendingType;
  strip.clear();

  if (currentMode == "text") {
    currentText = pendingText;
    currentFont = pendingFont;
    currentScrollMode = pendingMode;
    textColor = pendingColor;
    textBgColor = pendingBgColor;
    textSpeed = pendingSpeed;
    textYOffset = pendingYOffset;

    textTotalWidth = calculateTextWidth(currentText, currentFont);

    if (currentScrollMode == "scroll_left") {
      scrollX = MATRIX_WIDTH;
    } else if (currentScrollMode == "scroll_right") {
      // Start at left edge (0) so text is immediately visible moving rightwards!
      scrollX = 0;
    } else if (currentScrollMode == "static" || currentScrollMode == "blink") {
      // Auto-center text horizontally
      if (textTotalWidth < MATRIX_WIDTH) {
        scrollX = (MATRIX_WIDTH - textTotalWidth) / 2;
      } else {
        scrollX = 0;
      }
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
    currentAnimation = pendingAnimName;
    animSpeed = pendingSpeed;
    animColor1 = pendingColor1;
    animColor2 = pendingColor2;
    animStep = 0;
    memset(fireHeat, 0, sizeof(fireHeat));
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      rainPos[x] = -(rand() % MATRIX_HEIGHT);
      rainLength[x] = 2 + (rand() % 4);
      rainSpeed[x] = 1 + (rand() % 2);
    }
  }
  else if (currentMode == "image") {
    strip.clear();
    for (size_t i = 0; i < NUM_LEDS; i++) {
      uint8_t x = i % MATRIX_WIDTH;
      uint8_t y = i / MATRIX_WIDTH;
      setPixel(x, y, pendingImagePixels[i]);
    }
    showStrip();
  }
  else if (currentMode == "brightness") {
    strip.setBrightness(pendingBrightness);
    showStrip();
  }
  else if (currentMode == "clear") {
    strip.clear();
    showStrip();
  }

  // Persist updated mode and settings into onboard Flash memory (skip for real-time streaming frames to maximize FPS)
  if (currentMode != "image") {
    saveStateToNVS();
  }
}

void updateActiveLoop() {
  uint32_t now = millis();

  // 1. Text Engine (All 5 Modes)
  if (currentMode == "text") {
    if (currentScrollMode == "static") {
      // Nothing to animate, static frame already displayed
      return;
    }

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

    // Scrolling modes (scroll_left, scroll_right, bounce)
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

  // 2. Animation Engine (All 6 Profiles)
  else if (currentMode == "animation") {
    if (now - lastAnimTick >= animSpeed) {
      lastAnimTick = now;
      animStep++;

      if (currentAnimation == "matrix_rain") renderMatrixRain();
      else if (currentAnimation == "fire") renderFire();
      else if (currentAnimation == "pulse") renderPulse();
      else if (currentAnimation == "starfield") renderStarfield();
      else if (currentAnimation == "color_wipe") renderColorWipe();
      else renderRainbow(); // Rainbow & default
    }
  }
}

// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// Core 0: Wi-Fi Background Poller (Runs completely independent on Core 0)
// -------------------------------------------------------------------------
void networkWorker(void* param) {
  WiFiClientSecure secClient;
  secClient.setInsecure(); // Supports Render HTTPS without certificate errors

  HTTPClient http;
  http.setReuse(true); // HTTP Keep-Alive

  uint32_t lastPollTime = 0;
  uint32_t turboUntil = 0;
  bool isHttps = String(ENDPOINT_POLL).startsWith("https://");
  uint32_t basePollInterval = isHttps ? 2500 : 1000;
  uint16_t reqTimeout = isHttps ? 4000 : 1200;

  while (true) {
    uint32_t now = millis();

    if (WiFi.status() != WL_CONNECTED) {
      http.end();
      WiFi.reconnect();
      vTaskDelay(pdMS_TO_TICKS(2000));
      continue;
    }

    // Dynamic Gaming Poll Rate: Accelerates during active gameplay stream!
    // Local HTTP: 30ms (~33 FPS Max-Rate) | Cloud HTTPS: 350ms
    uint32_t activeInterval = (millis() < turboUntil) ? (isHttps ? 350 : 30) : basePollInterval;

    // Unified poll: fetches command + reports heartbeat + auto-acks lastId in ONE request!
    if (now - lastPollTime >= activeInterval) {
      lastPollTime = now;

      String url = String(ENDPOINT_POLL) + 
                   "?lastId=" + lastExecutedId + 
                   "&rssi=" + String(WiFi.RSSI()) + 
                   "&uptime=" + String(millis() / 1000) + 
                   "&ip=" + WiFi.localIP().toString() + 
                   "&fps=" + String(currentFps);

      if (isHttps) {
        http.begin(secClient, url);
      } else {
        http.begin(url);
      }
      http.setTimeout(reqTimeout);

      int code = http.GET();
      if (code == HTTP_CODE_OK) {
        String body = http.getString();

        // FAST PATH: If no new command, exit immediately without ANY heap allocation!
        if (body.indexOf("\"hasCommand\":true") == -1) {
          http.end();
          vTaskDelay(pdMS_TO_TICKS(millis() < turboUntil ? 10 : 50));
          continue;
        }

        // SLOW PATH: New command arrived! Allocate 6KB only for image pixel arrays, else 2KB
        bool isImage = (body.indexOf("\"image\"") != -1);
        if (isImage) {
          turboUntil = millis() + 30000; // Boost polling speed for 30s during active gameplay!
        }
        DynamicJsonDocument doc(isImage ? 6144 : 2048);
        DeserializationError err = deserializeJson(doc, body);

        if (!err && doc["hasCommand"].as<bool>()) {
          JsonObject cmd = doc["command"];
          String cmdId = cmd["id"].as<String>();

          if (cmdId != lastExecutedId) {
            String type = cmd["type"].as<String>();
            JsonObject params = cmd["params"];
            if (params.isNull()) params = cmd["payload"];

            if (type == "text") {
              pendingText = params["text"].as<String>();
              pendingFont = params["font"].as<String>();
              if (pendingFont.isEmpty()) pendingFont = "standard";
              pendingMode = params["mode"].as<String>();
              if (pendingMode.isEmpty()) pendingMode = "scroll_left";
              pendingColor = parseColor(params["color"], 0x00F0FF);
              pendingBgColor = parseColor(params["bgColor"], 0x000000);
              pendingSpeed = params["speed"].as<uint16_t>();
              if (pendingSpeed < 20) pendingSpeed = 40;
              pendingYOffset = params.containsKey("yOffset") ? params["yOffset"].as<int8_t>() : 1;
            }
            else if (type == "image") {
              if (params.containsKey("pixels")) {
                JsonArray pxArr = params["pixels"].as<JsonArray>();
                size_t count = pxArr.size();
                if (count > NUM_LEDS) count = NUM_LEDS;
                for (size_t i = 0; i < count; i++) {
                  JsonArray rgb = pxArr[i].as<JsonArray>();
                  if (rgb.size() >= 3) {
                    pendingImagePixels[i] = strip.Color(rgb[0].as<uint8_t>(), rgb[1].as<uint8_t>(), rgb[2].as<uint8_t>());
                  } else {
                    pendingImagePixels[i] = 0;
                  }
                }
              }
            }
            else if (type == "animation") {
              pendingAnimName = params["name"].as<String>();
              pendingSpeed = params["speed"].as<uint16_t>();
              if (pendingSpeed < 15) pendingSpeed = 35;
              pendingColor1 = parseColor(params["primaryColor"], 0x00F0FF);
              pendingColor2 = parseColor(params["secondaryColor"], 0xFF007F);
            }
            else if (type == "brightness") {
              uint8_t b = SAFE_BRIGHTNESS;
              if (params.containsKey("value")) b = params["value"].as<uint8_t>();
              else if (params.containsKey("brightness")) b = params["brightness"].as<uint8_t>();
              if (b > 180) b = 180;
              pendingBrightness = b;
            }
            else if (type == "mirror") {
              if (params.containsKey("mirrorX")) pendingMirrorX = params["mirrorX"].as<bool>();
              if (params.containsKey("mirrorY")) pendingMirrorY = params["mirrorY"].as<bool>();
              pendingHasMirrorUpdate = true;
            }

            if (params.containsKey("mirrorX")) {
              pendingMirrorX = params["mirrorX"].as<bool>();
              pendingHasMirrorUpdate = true;
            }
            if (params.containsKey("mirrorY")) {
              pendingMirrorY = params["mirrorY"].as<bool>();
              pendingHasMirrorUpdate = true;
            }

            pendingType = type;
            hasNewCommand = true;
            lastExecutedId = cmdId;
          }
        } else {
          // If JSON parse failed, extract cmdId directly to auto-ack and avoid infinite loop freeze
          int idIdx = body.indexOf("\"id\":\"");
          if (idIdx != -1) {
            int endIdx = body.indexOf("\"", idIdx + 6);
            if (endIdx != -1) {
              lastExecutedId = body.substring(idIdx + 6, endIdx);
            }
          }
        }
      } else {
        // Request failed or timed out: abort stale SSL connection to prevent socket hang
        if (code <= 0 && isHttps) {
          secClient.stop();
        }
      }
      http.end();
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// =========================================================================
// Setup
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, HIGH); // Turn on onboard Blue LED during boot

  Serial.println("\n==========================================");
  Serial.println("🚀 Matrix Studio - DOIT ESP32 DevKit V1");
  Serial.println("   Data Pin: D4 (GPIO 4) | 30x10 Matrix");
  Serial.println("   Status LED: D2 (GPIO 2 - Onboard Blue)");
  Serial.println("==========================================");

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
    delay(8);
    strip.clear();
  }
  showStrip();

  // Load last saved effect from onboard Flash (starts immediately before Wi-Fi!)
  loadStateFromNVS();
  applyPendingCommand();

  WiFi.mode(WIFI_STA);
  WiFi.softAPdisconnect(true);
  WiFi.setAutoReconnect(true);

  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttempt < 8000)) {
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Blink onboard blue LED
    delay(200);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH); // Solid blue on DevKit V1 when connected
    Serial.println("✓ Wi-Fi Connected!");
    Serial.print("  DevKit V1 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    digitalWrite(STATUS_LED_PIN, LOW); // Off if Wi-Fi pending
    Serial.println("⚠️ Wi-Fi still connecting in background. Matrix effect starting immediately!");
  }

  // Launch Core 0 Network Task with 20KB stack for robust TLS encryption
  xTaskCreatePinnedToCore(
    networkWorker,
    "netTask",
    20480,
    NULL,
    1,
    NULL,
    0 // Core 0
  );
}

// =========================================================================
// Core 1 Main Loop: 100% Dedicated to 60 FPS LED Animations
// =========================================================================
void loop() {
  // If Core 0 received a new effect, apply it immediately
  if (hasNewCommand) {
    hasNewCommand = false;
    applyPendingCommand();
    frameCount++;
  }

  // Run the active effect in endless loop
  updateActiveLoop();

  // Calculate live FPS once per second
  uint32_t now = millis();
  if (now - lastFpsCalcTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsCalcTime = now;
  }

  delay(2); // Yields to FreeRTOS IDLE1 task
}
