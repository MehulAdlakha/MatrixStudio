# Matrix Studio - Frontend

A responsive web dashboard and matrix studio built with **Next.js (App Router)**, **React 19**, and **Pure Vanilla CSS** (no Tailwind CSS).

## Features

- **Live 30×10 Matrix Simulator**: Real-time virtual LED canvas showing authentic circular LEDs with realistic glow and bloom.
- **Typography & Scrolling Text**:
  - Live character count (up to 200 characters).
  - Fonts: Standard 5×7, Cyber Bold, Compact Mini, Digital.
  - Movement Modes: Scroll Left, Scroll Right, Static Centered, Flash/Blink, Bounce.
  - Curated neon palettes + custom Hex color picker.
  - Scroll speed and vertical offset sliders.
- **Image Upload & Pixel Art Studio**:
  - Drag-and-drop file upload (PNG, JPG, WebP).
  - Client-side downscaling and pixelation to exact 30×10 dimensions.
  - Real-time contrast, brightness, and noise threshold controls.
  - Interactive 30×10 drawing editor with pencil, eraser, color palette, and clear canvas tools.
  - Retro pixel art presets (Space Invader, Cyber Heart, Matrix Rain, Lightning Bolt).
- **Animation Controls**:
  - Built-in animations: Rainbow Wave, Cyber Matrix Rain, Procedural Flame, Color Breathing, Starfield Sparkle, Radar Scanline.
  - Dynamic speed and intensity sliders.
  - Primary and secondary custom color pickers.
- **Hardware Telemetry & ESP32 Status**:
  - Real-time polling showing ESP32 online/offline indicator, device IP, Wi-Fi RSSI (dBm + quality rating), Free RAM (Heap), and system uptime.
- **Global Brightness**:
  - 0–255 (0–100%) slider with instant preset buttons (10%, 25%, 50%, 75%, 100%).
- **Command Delivery & Acknowledgement Log**:
  - Real-time activity log showing unique command IDs, timestamps, and ESP32 acknowledgement badges.
- **Responsive Mobile & Desktop Design**:
  - Tailored for desktop monitors, tablets, and smartphones on the same Wi-Fi network.

---

## Installation & Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   For localhost development:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```
   When controlling from your phone over Wi-Fi, change this to your computer's local network IP:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://192.168.1.150:5000
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
