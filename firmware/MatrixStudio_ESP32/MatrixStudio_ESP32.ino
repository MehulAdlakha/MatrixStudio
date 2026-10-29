/**
 * Matrix Studio - ESP32 Multi-File Firmware (Dual-Core Edition)
 * 
 * Hardware:
 *   - ESP32 Development Board (WROOM-32 / ESP32-S3)
 *   - 30x10 WS2812B Addressable RGB LED Matrix (300 LEDs)
 *   - Data Pin: GPIO 4 (configured in config.h)
 * 
 * Architecture:
 *   - Core 0: Dedicated Background Wi-Fi & HTTP Polling (Keep-Alive, zero-latency)
 *   - Core 1: Dedicated 60 FPS LED Render Engine (Zero Lag, No Stuttering)
 *   - Supports all 4 Fonts: Standard 5x7 (lowercase/symbols), Cyber Bold, Compact Mini, Digital Clock
 *   - Supports all 5 Text Modes: Scroll Left, Scroll Right, Static Centered, Flash/Blink, Bounce
 *   - Supports all 6 Animations: Rainbow Wave, Matrix Rain, Cyber Flame, Color Pulse, Starfield, Color Wipe
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"
#include "matrix_driver.h"
#include "animations.h"

// -------------------------------------------------------------------------
// Thread-Safe Handoff Structure (Core 0 Network -> Core 1 Renderer)
// -------------------------------------------------------------------------
struct CommandHandoff {
  volatile bool hasNew = false;
  String id;
  String type;
  // Text parameters
  String text;
  String fontStr;
  String modeStr;
  uint32_t color;
  uint32_t bgColor;
  uint16_t speed;
  int8_t yOffset;
  // Animation parameters
  String animName;
  uint16_t animSpeed;
  uint8_t animIntensity;
  uint32_t animColor1;
  uint32_t animColor2;
  // Brightness / Image parameters
  uint8_t brightness;
  // Universal Mirror parameters
  bool hasMirrorUpdate;
  bool mirrorX;
  bool mirrorY;
};

static CommandHandoff pendingCmd;
static uint32_t pendingImagePixels[NUM_LEDS];
static String lastExecutedCommandId = "";

// Forward declarations
uint32_t parseColor(JsonVariant colorVar, uint32_t defaultColor);
void applyCommand();

// =========================================================================
// Core 0: Dedicated Wi-Fi & Network Worker Task (Localhost & Cloud Ready)
// =========================================================================
void networkWorkerTask(void* parameter) {
  HTTPClient http;
  http.setReuse(true); // HTTP Keep-Alive

  uint32_t lastPollTime = 0;
  uint32_t lastStatusTime = 0;

  WiFiClientSecure secClient;
  secClient.setInsecure();

  while (true) {
    uint32_t now = millis();

    // 1. Maintain Wi-Fi Connection
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
      vTaskDelay(pdMS_TO_TICKS(2000));
      continue;
    }

    // 2. Poll Backend for Commands every 600ms
    if (now - lastPollTime >= DEVICE_POLL_INTERVAL_MS) {
      lastPollTime = now;

      String pollUrl = String(BACKEND_BASE_URL) + ENDPOINT_POLL + "?lastId=" + lastExecutedCommandId;
      if (pollUrl.startsWith("https://")) {
        http.begin(secClient, pollUrl);
      } else {
        http.begin(pollUrl);
      }
      http.setTimeout(1200);

      int httpCode = http.GET();
      if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();

        // FAST PATH: If no new command, exit immediately without ANY heap allocation!
        if (payload.indexOf("\"hasCommand\":true") == -1) {
          http.end();
          vTaskDelay(pdMS_TO_TICKS(50));
          continue;
        }

        // SLOW PATH: New command arrived! Allocate 32KB only for image pixel arrays, else 2KB
        bool isImage = (payload.indexOf("\"image\"") != -1);
        DynamicJsonDocument doc(isImage ? 32768 : 2048);
        DeserializationError error = deserializeJson(doc, payload);

        if (!error && doc["hasCommand"].as<bool>()) {
          JsonObject command = doc["command"];
          String cmdId = command["id"].as<String>();

          if (cmdId != lastExecutedCommandId && !pendingCmd.hasNew) {
            String type = command["type"].as<String>();
            JsonObject params = command["params"];
            if (params.isNull()) params = command["payload"];

            pendingCmd.id = cmdId;
            pendingCmd.type = type;

            if (type == "text") {
              pendingCmd.text = params["text"].as<String>();
              pendingCmd.fontStr = params["font"].as<String>();
              if (pendingCmd.fontStr.isEmpty()) pendingCmd.fontStr = "standard";
              pendingCmd.modeStr = params["mode"].as<String>();
              if (pendingCmd.modeStr.isEmpty()) pendingCmd.modeStr = "scroll_left";
              pendingCmd.color = parseColor(params["color"], 0x00FF88);
              pendingCmd.bgColor = parseColor(params["bgColor"], 0x000000);
              pendingCmd.speed = params["speed"].as<uint16_t>();
              if (pendingCmd.speed < 20) pendingCmd.speed = 40;
              pendingCmd.yOffset = params.containsKey("yOffset") ? params["yOffset"].as<int8_t>() : 1;
            }
            else if (type == "image") {
              if (params.containsKey("pixels")) {
                JsonArray pxArr = params["pixels"].as<JsonArray>();
                size_t count = pxArr.size();
                if (count > NUM_LEDS) count = NUM_LEDS;
                for (size_t i = 0; i < count; i++) {
                  JsonArray rgb = pxArr[i].as<JsonArray>();
                  if (rgb.size() >= 3) {
                    pendingImagePixels[i] = matrix.Color(rgb[0].as<uint8_t>(), rgb[1].as<uint8_t>(), rgb[2].as<uint8_t>());
                  } else {
                    pendingImagePixels[i] = 0;
                  }
                }
              }
            }
            else if (type == "animation") {
              pendingCmd.animName = params["name"].as<String>();
              pendingCmd.animSpeed = params["speed"].as<uint16_t>();
              if (pendingCmd.animSpeed < 15) pendingCmd.animSpeed = 35;
              pendingCmd.animIntensity = params.containsKey("intensity") ? params["intensity"].as<uint8_t>() : 80;
              pendingCmd.animColor1 = parseColor(params["primaryColor"], 0x00F0FF);
              pendingCmd.animColor2 = parseColor(params["secondaryColor"], 0xFF007F);
            }
            else if (type == "brightness") {
              uint8_t b = SAFE_BRIGHTNESS;
              if (params.containsKey("value")) b = params["value"].as<uint8_t>();
              else if (params.containsKey("brightness")) b = params["brightness"].as<uint8_t>();
              if (b > 180) b = 180;
              pendingCmd.brightness = b;
            }
            else if (type == "mirror") {
              if (params.containsKey("mirrorX")) pendingCmd.mirrorX = params["mirrorX"].as<bool>();
              if (params.containsKey("mirrorY")) pendingCmd.mirrorY = params["mirrorY"].as<bool>();
              pendingCmd.hasMirrorUpdate = true;
            }

            if (params.containsKey("mirrorX")) {
              pendingCmd.mirrorX = params["mirrorX"].as<bool>();
              pendingCmd.hasMirrorUpdate = true;
            }
            if (params.containsKey("mirrorY")) {
              pendingCmd.mirrorY = params["mirrorY"].as<bool>();
              pendingCmd.hasMirrorUpdate = true;
            }

            // Flag Core 1 to apply new effect immediately
            pendingCmd.hasNew = true;
            lastExecutedCommandId = cmdId;

            // Send instant ACK to backend
            HTTPClient ackHttp;
            String ackUrl = String(BACKEND_BASE_URL) + ENDPOINT_ACK;
            if (ackUrl.startsWith("https://")) {
              ackHttp.begin(secClient, ackUrl);
            } else {
              ackHttp.begin(ackUrl);
            }
            ackHttp.addHeader("Content-Type", "application/json");
            ackHttp.POST("{\"commandId\":\"" + cmdId + "\",\"status\":\"COMPLETED\",\"message\":\"Applied to matrix\"}");
            ackHttp.end();
          }
        }
      }
      http.end();
    }

    // 3. Send Heartbeat Telemetry every 10s
    if (now - lastStatusTime >= DEVICE_STATUS_INTERVAL_MS) {
      lastStatusTime = now;
      HTTPClient statHttp;
      String statUrl = String(BACKEND_BASE_URL) + ENDPOINT_STATUS;
      if (statUrl.startsWith("https://")) {
        statHttp.begin(secClient, statUrl);
      } else {
        statHttp.begin(statUrl);
      }
      statHttp.addHeader("Content-Type", "application/json");
      String statBody = "{\"deviceId\":\"ESP32_Matrix\",\"ip\":\"" + WiFi.localIP().toString() + "\",\"rssi\":" + String(WiFi.RSSI()) + ",\"uptimeSec\":" + String(millis() / 1000) + ",\"mode\":\"" + matrix.getModeString() + "\"}";
      statHttp.POST(statBody);
      statHttp.end();
    }

    // Small delay to yield Core 0 RTOS
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// =========================================================================
// Setup (Initializes hardware and spawns Core 0 Network Task)
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println("\n==========================================");
  Serial.println("🚀 Matrix Studio ESP32 Initializing...");
  Serial.println("==========================================");

  // Initialize LED Matrix Hardware
  matrix.begin();

  // Quick boot splash animation (Cyan wave)
  for (uint8_t x = 0; x < MATRIX_WIDTH; x++) {
    for (uint8_t y = 0; y < MATRIX_HEIGHT; y++) {
      matrix.setPixel(x, y, 0, 240, 255);
    }
    matrix.show();
    delay(8);
    matrix.clear();
  }
  matrix.show();

  // Configure Wi-Fi in Station mode ONLY
  WiFi.mode(WIFI_STA);
  WiFi.softAPdisconnect(true);
  WiFi.setAutoReconnect(true);

  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttempt < 8000)) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ Wi-Fi Connected!");
    Serial.print("  ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("⚠️ Wi-Fi not connected yet. Core 0 will auto-reconnect.");
  }

  // Pin Network Worker to Core 0 (Zero-Lag Dual-Core Architecture)
  xTaskCreatePinnedToCore(
    networkWorkerTask,
    "NetWorker",
    16384,
    NULL,
    1,
    NULL,
    0 // Core 0
  );

  // Default initial active effect
  matrix.configureText("MATRIX STUDIO", 0x00F0FF, 0x000000, 50, SCROLL_LEFT, 1, FONT_STANDARD);
}

// =========================================================================
// Core 1 Main Loop: 100% Dedicated to 60 FPS LED Animations
// =========================================================================
void loop() {
  uint32_t now = millis();

  // Check if Core 0 delivered a new command
  if (pendingCmd.hasNew) {
    pendingCmd.hasNew = false;
    applyCommand();
  }

  // Execute Active Effect Loop (Zero-Lag!)
  if (matrix.getCurrentMode() == MODE_TEXT) {
    matrix.updateText(now);
  } else if (matrix.getCurrentMode() == MODE_ANIMATION) {
    animations.update(now);
  }

  // Micro delay to yield Core 1
  yield();
}

// =========================================================================
// Command Execution on Core 1
// =========================================================================
void applyCommand() {
  if (pendingCmd.hasMirrorUpdate) {
    matrix.setMirror(pendingCmd.mirrorX, pendingCmd.mirrorY);
    pendingCmd.hasMirrorUpdate = false;
    Serial.printf("  🪞 Universal Mirror: X=%s, Y=%s\n", pendingCmd.mirrorX ? "ON" : "OFF", pendingCmd.mirrorY ? "ON" : "OFF");

    if (matrix.getCurrentMode() == MODE_IMAGE) {
      matrix.clear();
      for (size_t i = 0; i < NUM_LEDS; i++) {
        uint8_t x = i % MATRIX_WIDTH;
        uint8_t y = i / MATRIX_WIDTH;
        matrix.setPixel(x, y, pendingImagePixels[i]);
      }
      matrix.show();
    }
  }

  String type = pendingCmd.type;
  if (type == "mirror") {
    return;
  }

  if (type == "text") {
    animations.stop();

    TextFont font = FONT_STANDARD;
    if (pendingCmd.fontStr == "bold") font = FONT_BOLD;
    else if (pendingCmd.fontStr == "mini") font = FONT_MINI;
    else if (pendingCmd.fontStr == "digital") font = FONT_DIGITAL;

    TextScrollMode mode = SCROLL_LEFT;
    if (pendingCmd.modeStr == "scroll_right") mode = SCROLL_RIGHT;
    else if (pendingCmd.modeStr == "static") mode = TEXT_STATIC;
    else if (pendingCmd.modeStr == "blink") mode = TEXT_BLINK;
    else if (pendingCmd.modeStr == "bounce") mode = TEXT_BOUNCE;

    matrix.configureText(pendingCmd.text, pendingCmd.color, pendingCmd.bgColor,
                         pendingCmd.speed, mode, pendingCmd.yOffset, font);
  } else if (type == "image") {
    animations.stop();
    matrix.setMode(MODE_IMAGE);
    matrix.clear();
    for (size_t i = 0; i < NUM_LEDS; i++) {
      uint8_t x = i % MATRIX_WIDTH;
      uint8_t y = i / MATRIX_WIDTH;
      matrix.setPixel(x, y, pendingImagePixels[i]);
    }
    matrix.show();
    Serial.println("  ✓ Active Image (30x10 custom frame) rendered.");

  } else if (type == "animation") {
    matrix.setMode(MODE_ANIMATION);
    animations.configure(pendingCmd.animName, pendingCmd.animSpeed, pendingCmd.animIntensity,
                         pendingCmd.animColor1, pendingCmd.animColor2);
    Serial.printf("  ✓ Active Animation: %s (speed: %dms)\n", pendingCmd.animName.c_str(), pendingCmd.animSpeed);

  } else if (type == "brightness") {
    matrix.setBrightness(pendingCmd.brightness);
    Serial.printf("  ✓ Brightness: %d\n", pendingCmd.brightness);

  } else if (type == "clear") {
    animations.stop();
    matrix.setMode(MODE_IDLE);
    matrix.clear();
    matrix.show();
    Serial.println("  ✓ Matrix Cleared.");
  }
}

// =========================================================================
// Color Parser Helper
// =========================================================================
uint32_t parseColor(JsonVariant colorVar, uint32_t defaultColor) {
  if (colorVar.isNull()) return defaultColor;
  if (colorVar.is<JsonArray>()) {
    JsonArray arr = colorVar.as<JsonArray>();
    if (arr.size() >= 3) {
      return matrix.Color(arr[0].as<uint8_t>(), arr[1].as<uint8_t>(), arr[2].as<uint8_t>());
    }
  }
  if (colorVar.is<const char*>()) {
    const char* hexStr = colorVar.as<const char*>();
    if (hexStr[0] == '#') hexStr++;
    long num = strtol(hexStr, NULL, 16);
    return (uint32_t)num;
  }
  return defaultColor;
}
