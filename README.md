# Matrix Studio

> **High-Performance 30×10 (300 WS2812B LEDs) Controller & Dashboard Architecture**  
> Built with Next.js (App Router, JavaScript, Plain CSS), Node.js + Express REST API backend, and ESP32 Arduino C++ firmware.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Matrix Studio Dashboard                  │
│           Next.js (App Router) + Pure Vanilla CSS           │
│             Browser / Smartphone (Port 3000)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
               HTTP REST API   │  - POST /api/commands
             (JSON over Wi-Fi) │  - GET  /api/device/status
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Node.js + Express REST Backend                │
│                 Port 5000 (Localhost / LAN)                 │
│  ─────────────────────────────────────────────────────────  │
│  • In-Memory Store (Active Command & History)               │
│  • Strict Payload Validation (300 RGB Pixels, Text, Speeds)│
│  • Unique Command IDs (cmd_<timestamp>_<hash>)              │
│  • Delivery Acknowledgment System (No repeated executions)  │
│  • CORS Restricted to Configured Origin                     │
└──────────────────────────────▲──────────────────────────────┘
                               │
               HTTP Polling    │  - GET  /api/device/poll (~500ms)
                 & Telemetry   │  - POST /api/device/ack
                               │  - POST /api/device/status (~3s)
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                   ESP32 Microcontroller                     │
│               Firmware in Arduino C++ (FreeRTOS)            │
│  ─────────────────────────────────────────────────────────  │
│  • Station Mode Only (Never starts an AP)                   │
│  • Non-Blocking HTTP Polling Loop (No delay() freezing)     │
│  • Automatic Graceful Reconnect (No reboot loops)           │
│  • Configurable Zigzag (Serpentine) 30x10 Coordinate Mapper │
│  • Fast 5x7 Typography & Scrolling Engine                   │
│  • Custom 300-Pixel RGB Image Frame Unpacker                │
│  • Built-in Hardware Animations (Rainbow, Fire, Rain, Pulse)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                      GPIO 5   │  WS2812B Data (800 kHz)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            30 × 10 WS2812B Addressable LED Matrix           │
│                   300 Individually Addressable LEDs         │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Organization

```
d:\led matrix\
├── backend/                  # Node.js + Express REST API Backend
│   ├── .env.example          # Environment variables template
│   ├── .env                  # Active environment configuration
│   ├── package.json          # Express, CORS, Dotenv dependencies
│   ├── server.js             # Express entry point & CORS configuration
│   ├── src/
│   │   ├── routes.js         # REST endpoints (commands, device poll, ack, status)
│   │   ├── store.js          # In-memory store for active command & telemetries
│   │   └── validator.js      # Data validation (text length, 300-pixel RGB array, etc.)
│   └── README.md             # Backend reference and API docs
│
├── frontend/                 # Next.js App Router Web Dashboard
│   ├── .env.example          # Environment variables template
│   ├── .env.local            # Local frontend configuration
│   ├── package.json          # Next.js 16, React 19 dependencies (No Tailwind!)
│   ├── next.config.mjs       # Next.js configuration
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css   # Bespoke Cyberpunk Neon design system in Pure CSS
│   │   │   ├── layout.js     # Root layout & SEO metadata
│   │   │   └── page.js       # Main dashboard with real-time status & virtual simulator
│   │   ├── components/
│   │   │   ├── Header.js           # Brand header, clear button & LAN IP modal
│   │   │   ├── DeviceStatus.js     # ESP32 telemetry bar (online, IP, RSSI, heap, uptime)
│   │   │   ├── MatrixPreview.js    # 30x10 virtual LED matrix simulator with glow
│   │   │   ├── TextControl.js      # Text message, fonts, speeds, movement modes
│   │   │   ├── PixelCanvas.js      # Drag-and-drop image scaler & interactive 30x10 editor
│   │   │   ├── AnimationControl.js # Rainbow, Fire, Matrix Rain, Pulse controls
│   │   │   ├── BrightnessControl.js# Global brightness slider & presets
│   │   │   ├── CommandHistory.js   # Real-time command log with delivery acks
│   │   │   └── Toast.js            # Floating alert toasts
│   │   └── lib/
│   │       ├── api.js              # REST client for backend
│   │       └── imageProcessor.js   # Client-side 30x10 downscaler & pixel presets
│   └── README.md             # Frontend reference
│
├── firmware/                 # Firmware Editions
│   ├── README.md             # Flashing instructions and wiring diagrams
│   ├── MatrixStudio_ESP32_DevKit_V1/
│   │   └── MatrixStudio_ESP32_DevKit_V1.ino # Dedicated single-file for DOIT ESP32 DevKit V1 (D4 data, D2 status LED)
│   ├── MatrixStudio_ESP32_SingleFile/
│   │   └── MatrixStudio_ESP32_SingleFile.ino # All-in-one single-file edition for standard ESP32
│   ├── MatrixStudio_ESP8266_SingleFile/
│   │   └── MatrixStudio_ESP8266_SingleFile.ino # Dedicated single-file for ESP8266 NodeMCU (D2 data)
│   └── MatrixStudio_ESP32/
│       ├── MatrixStudio_ESP32.ino # Main Arduino sketch (modular multi-file)
│       ├── config.h          # Wi-Fi SSID, backend URL, GPIO pin, zigzag flags
│       ├── matrix_driver.h   # Serpentine XY mapper & typography engine header
│       ├── matrix_driver.cpp # Driver implementation with 5x7 ASCII font table
│       ├── animations.h      # Animation engine header
│       └── animations.cpp    # Procedural flame, rainbow wave, matrix rain renderers
│
└── README.md                 # Complete system documentation
```

---

## Quick Start Guide

### Step 1: Start the Backend Server

```bash
cd backend
npm install
npm run dev
```

The backend starts at `http://localhost:5000` (and on all network interfaces `http://0.0.0.0:5000`).

---

### Step 2: Start the Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser. You will see the Matrix Studio cyber dashboard and 30×10 virtual simulator.

---

### Step 3: Configure and Flash the ESP32

1. Open `firmware/MatrixStudio_ESP32/MatrixStudio_ESP32.ino` in **Arduino IDE**.
2. Open `firmware/MatrixStudio_ESP32/config.h` and configure:
   - Your Wi-Fi network SSID & Password.
   - Your computer's local network IP address (e.g., `http://192.168.1.150:5000`).
3. In Arduino IDE Library Manager, ensure the following are installed:
   - **Adafruit NeoPixel**
   - **Adafruit GFX Library**
   - **ArduinoJson**
4. Connect the ESP32 via USB and click **Upload**.
5. Open Serial Monitor at **115200 baud** to see Wi-Fi connection and backend polling logs.

---

## Local Network (LAN) Configuration

During initial development, the frontend and backend communicate over `localhost`. To allow your physical ESP32 and smartphone to connect over the same Wi-Fi network:

### 1. Find Your Computer's LAN IP Address

- **Windows**:
  Open PowerShell or Command Prompt and run:
  ```powershell
  ipconfig
  ```
  Look for **IPv4 Address** under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.150`).

- **macOS / Linux**:
  ```bash
  ifconfig | grep "inet "
  # or
  ip a
  ```

---

### 2. Configure Backend (`backend/.env`)

Add your LAN IP and mobile port to `FRONTEND_URL` so CORS allows your phone:

```env
PORT=5000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000,http://192.168.1.150:3000
DEVICE_TIMEOUT_MS=3500
```

---

### 3. Configure Frontend (`frontend/.env.local`)

Set the backend URL to your computer's LAN IP:

```env
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.150:5000
```

*(You can also click the **"Network IP"** button in the dashboard header at any time to dynamically change the backend URL directly from your browser or phone without restarting).*

---

### 4. Configure ESP32 Firmware (`firmware/MatrixStudio_ESP32/config.h`)

Point the ESP32 to the backend server running on your computer:

```cpp
#define WIFI_SSID         "MyHomeWiFi"
#define WIFI_PASSWORD     "MySecretPassword"
#define BACKEND_BASE_URL  "http://192.168.1.150:5000"
```

Now the ESP32, your computer, and your phone all communicate seamlessly across your local Wi-Fi router.

---

## Hardware Wiring Guide

| ESP32 Pin | WS2812 Matrix Pin | Notes |
|-----------|-------------------|-------|
| **GPIO 5**| **DIN** (Data In) | WS2812B 800 kHz protocol signal via 330Ω resistor |
| **GND**   | **GND**           | **CRITICAL**: ESP32 GND must be tied to Matrix Power Supply GND |
| —         | **5V DC**         | Powered directly by external 5V 5A–10A supply |

### Configurable Zigzag (Serpentine) Mapping

Most DIY flexible 30×10 matrices are wired in a serpentine / zigzag pattern (even rows left-to-right, odd rows right-to-left). This is configured in `firmware/MatrixStudio_ESP32/config.h`:

```cpp
#define SERPENTINE_LAYOUT   true    // true = zigzag; false = straight row-by-row
#define MATRIX_HORIZONTAL   true    // true = horizontal rows; false = columns
#define FIRST_LED_TOP_LEFT  true    // true = index 0 is at (0, 0)
```

The driver dynamically maps any `(x, y)` coordinate to the correct WS2812 hardware LED index:
```cpp
uint16_t MatrixDriver::XY(uint8_t x, uint8_t y) {
  if (x >= MATRIX_WIDTH || y >= MATRIX_HEIGHT) return NUM_LEDS;
  if (SERPENTINE_LAYOUT) {
    if (y % 2 == 1) return (y * MATRIX_WIDTH) + (MATRIX_WIDTH - 1 - x);
    else return (y * MATRIX_WIDTH) + x;
  }
  return (y * MATRIX_WIDTH) + x;
}
```

---

## REST API Reference

### 1. Send Display Command
`POST /api/commands`

#### A. Text Message
```bash
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "params": {
      "text": "HELLO WORLD",
      "color": "#00f0ff",
      "bgColor": "#000000",
      "speed": 60,
      "mode": "scroll_left",
      "font": "standard",
      "yOffset": 1
    }
  }'
```

#### B. 30×10 Custom Pixel Image (300 RGB Pixels)
```bash
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image",
    "params": {
      "pixels": [
        [0, 240, 255], [0, 240, 255], [0, 0, 0], ...
      ]
    }
  }'
```

#### C. Built-in Animation
```bash
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "animation",
    "params": {
      "name": "matrix_rain",
      "speed": 40,
      "intensity": 80,
      "primaryColor": "#00ff88",
      "secondaryColor": "#00f0ff"
    }
  }'
```

#### D. Global Brightness
```bash
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "brightness",
    "params": {
      "value": 180
    }
  }'
```

#### E. Clear Matrix
```bash
curl -X POST http://localhost:5000/api/commands/clear
```

---

### 2. Device Polling Endpoint (Used by ESP32)
`GET /api/device/poll`

When a new command is queued:
```json
{
  "success": true,
  "hasCommand": true,
  "command": {
    "id": "cmd_1729988123456_a1b2c3d4",
    "type": "text",
    "params": {
      "text": "HELLO WORLD",
      "color": [0, 240, 255],
      "speed": 60,
      "mode": "scroll_left"
    },
    "createdAt": "2026-10-27T00:15:00.000Z",
    "acknowledged": false
  }
}
```

---

### 3. Command Acknowledgement (Sent by ESP32)
`POST /api/device/ack`

```json
{
  "commandId": "cmd_1729988123456_a1b2c3d4",
  "status": "success",
  "message": "Rendered successfully"
}
```

---

### 4. Device Telemetry Heartbeat (Sent by ESP32)
`POST /api/device/status`

```json
{
  "ip": "192.168.1.185",
  "rssi": -55,
  "freeHeap": 194200,
  "uptime": 3600,
  "currentMode": "text",
  "brightness": 180,
  "fps": 60
}
```

---

## Architectural Guarantees & Constraints

1. **Pure Vanilla CSS**: Zero Tailwind CSS classes used anywhere in the dashboard; maximum styling control and high-fidelity cyber aesthetics.
2. **Decoupled Backend**: Separate Node.js + Express server in `/backend`. Next.js API routes are not used as the backend.
3. **No Python / FastAPI / TypeScript / Database**: Built with modern JavaScript (ES6+), Arduino C++, and clean in-memory architecture ready for persistent databases (MongoDB/PostgreSQL) later.
4. **Resilient Wi-Fi Loop**: ESP32 never restarts on temporary network dropouts; it retries in the background while continuing active display animations.
5. **Real Hardware End-to-End**: Every control (text, image, animation, brightness, clear) dispatches actual byte sequences to GPIO 5 driving the 300 WS2812 LEDs.
