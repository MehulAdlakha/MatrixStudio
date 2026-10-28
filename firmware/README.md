# Matrix Studio - ESP32 Firmware

Firmware for the ESP32 microcontroller driving a **30×10 WS2812B Addressable RGB LED Matrix (300 LEDs)**.

## Hardware Specifications

| Component | Specification |
|-----------|---------------|
| Microcontroller | ESP32 (WROOM-32, ESP32-S3, NodeMCU-32S, etc.) |
| LED Type | WS2812B / NeoPixel (800 kHz protocol) |
| Dimensions | 30 columns × 10 rows (300 total LEDs) |
| Data Pin | **GPIO 5** |
| Power Supply | 5V external power supply (recommend 5V 4A-10A for 300 LEDs) |
| Common Ground | ESP32 GND **must be tied to 5V power supply GND** |

---

## Wiring Diagram

```
5V Power Supply (+) ─────────────────────► 5V DC IN on WS2812 Matrix
5V Power Supply (-) ─────────┬───────────► GND on WS2812 Matrix
                             │
                             └───────────► ESP32 GND (Common Ground)

ESP32 GPIO 5 ──────── [330Ω - 470Ω Resistor] ──► DIN (Data In) on WS2812 Matrix
ESP32 Micro-USB / 5V (VIN) ───────────────────► USB power or 5V regulator
```

> [!IMPORTANT]
> Always place a 1000 µF (6.3V or higher) electrolytic capacitor across the 5V and GND power terminals near the matrix to protect the LEDs against voltage spikes during startup.

---

## Arduino IDE Setup

### 1. ESP32 Board Package
1. Open **Arduino IDE** (v2.x recommended).
2. Go to **File -> Preferences**.
3. In **Additional boards manager URLs**, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools -> Board -> Boards Manager**, search for **esp32** by Espressif Systems and click **Install**.

### 2. Required Libraries
Install the following libraries via **Tools -> Manage Libraries**:
1. **Adafruit NeoPixel** (by Adafruit) - v1.11.0 or higher
2. **Adafruit GFX Library** (by Adafruit) - v1.11.5 or higher
3. **ArduinoJson** (by Benoit Blanchon) - v6.21.x or v7.x

---

## Configuration

Open `firmware/MatrixStudio_ESP32/config.h`:

1. **Set your Wi-Fi credentials**:
   ```cpp
   #define WIFI_SSID       "YourWiFiNetwork"
   #define WIFI_PASSWORD   "YourWiFiPassword"
   ```

2. **Set your computer's local network IP**:
   Find your local IPv4 address by running `ipconfig` (Windows) or `ifconfig` (macOS/Linux):
   ```cpp
   #define BACKEND_BASE_URL "http://192.168.1.150:5000"
   ```

3. **Verify Matrix Wiring**:
   If your matrix is wired with serpentine (zigzag) rows (standard for flexible grid panels):
   ```cpp
   #define SERPENTINE_LAYOUT   true
   #define MATRIX_HORIZONTAL   true
   #define FIRST_LED_TOP_LEFT  true
   ```

---

## Flashing the ESP32

1. Connect your ESP32 to your computer via USB.
2. Select your board under **Tools -> Board -> ESP32 Arduino -> ESP32 Dev Module**.
3. Select your serial port under **Tools -> Port**.
4. Open the Serial Monitor at **115200 baud**.
5. Click **Upload**.

On boot, the Serial Monitor will output:
```
==========================================
🚀 Matrix Studio ESP32 Initializing...
==========================================
Connecting to Wi-Fi SSID: YourWiFiNetwork
......
✓ Wi-Fi Connected!
  IP Address: 192.168.1.185
  RSSI: -54 dBm
Backend Target: http://192.168.1.150:5000
```
