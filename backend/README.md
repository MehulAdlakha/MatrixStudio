# Matrix Studio Backend API

Express.js REST API server for controlling a 30×10 WS2812 LED Matrix display via an ESP32 microcontroller.

## Architecture

```
Frontend (Next.js Dashboard)
       │
       │ HTTP REST API (Commands / State / Brightness)
       ▼
Node.js + Express Backend (:5000)
  ├── In-Memory Command Queue & State
  ├── Real-Time Device Telemetry Monitor
  └── Command ID & Acknowledgment System
       ▲
       │ HTTP Polling (~500ms) & Heartbeat Reporting
       │
ESP32 Microcontroller (Firmware)
       │ GPIO 5 (WS2812B 800kHz)
       ▼
30x10 LED Matrix (300 WS2812 LEDs)
```

## Features

- **Decoupled Architecture**: Completely separate from the Next.js frontend with independent lifecycle.
- **In-Memory Store**: Tracks active command, unacknowledged queue, and real-time device telemetries (heap, RSSI, uptime, current mode).
- **Unique Command IDs**: Every display command receives a unique ID (`cmd_<timestamp>_<hash>`) preventing duplicate executions.
- **Acknowledgement Protocol**: ESP32 confirms execution via `POST /api/device/ack` so commands execute once.
- **Strict Data Validation**: Validates text length (max 200), 300-pixel RGB arrays (`[r,g,b]` 0-255), brightness values (0-255), animation profiles, and scrolling speeds.
- **CORS Configured**: Restricts origins based on environment configuration (`FRONTEND_URL`).

---

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start the Server**:
   ```bash
   # Production
   npm start

   # Development (with auto-reload)
   npm run dev
   ```

The server listens on `http://localhost:5000` (or `http://0.0.0.0:5000`).

---

## REST API Reference

### 1. Queue a New Display Command
`POST /api/commands`

#### Example A: Scrolling Text
```bash
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "params": {
      "text": "MATRIX STUDIO",
      "color": "#00ffc8",
      "bgColor": "#000000",
      "speed": 60,
      "mode": "scroll_left",
      "font": "standard",
      "yOffset": 1
    }
  }'
```

#### Example B: Animation
```bash
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "animation",
    "params": {
      "name": "rainbow",
      "speed": 40,
      "intensity": 80,
      "primaryColor": "#ff007f",
      "secondaryColor": "#00f0ff"
    }
  }'
```

#### Example C: Custom 30x10 Pixel Image
```bash
# pixels: array of 300 [R, G, B] items
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image",
    "params": {
      "pixels": [
        [255, 0, 0], [0, 255, 0], [0, 0, 255], ...
      ]
    }
  }'
```

#### Example D: Brightness
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

---

### 2. Device Polling (Used by ESP32)
`GET /api/device/poll`

**Response when a command is pending:**
```json
{
  "success": true,
  "hasCommand": true,
  "command": {
    "id": "cmd_1729988123456_a1b2c3d4",
    "type": "text",
    "params": {
      "text": "MATRIX STUDIO",
      "color": [0, 255, 200],
      "speed": 60,
      "mode": "scroll_left"
    },
    "createdAt": "2026-10-27T00:15:00.000Z",
    "acknowledged": false
  }
}
```

**Response when no new command is pending:**
```json
{
  "success": true,
  "hasCommand": false,
  "currentCommandId": "cmd_1729988123456_a1b2c3d4"
}
```

---

### 3. Device Acknowledgement (Used by ESP32)
`POST /api/device/ack`

**Request Body:**
```json
{
  "commandId": "cmd_1729988123456_a1b2c3d4",
  "status": "success",
  "message": "Rendered successfully"
}
```

---

### 4. Device Telemetry & Heartbeat (Used by ESP32)
`POST /api/device/status`

**Request Body:**
```json
{
  "ip": "192.168.1.185",
  "rssi": -58,
  "freeHeap": 194200,
  "uptime": 3600,
  "currentMode": "text",
  "brightness": 180,
  "fps": 58
}
```

---

### 5. Frontend Status Check
`GET /api/device/status`

**Response:**
```json
{
  "success": true,
  "device": {
    "online": true,
    "lastSeen": "2026-10-27T00:15:20.123Z",
    "secondsSinceLastSeen": 1,
    "ip": "192.168.1.185",
    "rssi": -58,
    "freeHeap": 194200,
    "uptime": 3600,
    "currentMode": "text",
    "brightness": 180,
    "fps": 58
  }
}
```
