#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// =========================================================================
// Wi-Fi Configuration (Station Mode only - NEVER creates an Access Point)
// =========================================================================
#define WIFI_SSID       "VANS_EXT"
#define WIFI_PASSWORD   "tunaktunak"
#define WIFI_RETRY_INTERVAL_MS 5000

// =========================================================================
// Backend Server Configuration
// Use your computer's local network IP address (e.g. 192.168.1.150)
// To find your IP: run 'ipconfig' (Windows) or 'ifconfig' / 'ip a' (Mac/Linux)
// =========================================================================
#define BACKEND_BASE_URL    "http://192.168.1.100:5000"
#define ENDPOINT_POLL       "/api/device/poll"
#define ENDPOINT_ACK        "/api/device/ack"
#define ENDPOINT_STATUS     "/api/device/status"

// =========================================================================
// Hardware & Matrix Configuration
// =========================================================================
#define LED_PIN             4       // GPIO 4 for WS2812 data signal
#define MATRIX_WIDTH        30      // 30 columns
#define MATRIX_HEIGHT       10      // 10 rows
#define NUM_LEDS            (MATRIX_WIDTH * MATRIX_HEIGHT) // 300 LEDs
#define LED_COLOR_ORDER     NEO_GRB // Standard WS2812B GRB byte order
#define LED_SPEED           NEO_KHZ800

// =========================================================================
// Configurable Zigzag (Serpentine) Wiring Layout
// In standard DIY serpentine matrices, even rows run Left->Right (0 to 29)
// and odd rows run Right->Left (29 to 0).
// Adjust these flags if your matrix starts from bottom or runs vertically.
// =========================================================================
#define SERPENTINE_LAYOUT   true    // true = zigzag wiring; false = straight row-by-row
#define MATRIX_HORIZONTAL   true    // true = rows wired horizontally; false = column-wise
#define FIRST_LED_TOP_LEFT  true    // true = pixel 0 is at (0,0) Top-Left

// Default LED Brightness (0 - 255)
#define DEFAULT_BRIGHTNESS  100

// =========================================================================
// Polling and Telemetry Timers
// =========================================================================
#define DEVICE_POLL_INTERVAL_MS   500   // Poll backend for commands every ~500ms
#define DEVICE_STATUS_INTERVAL_MS 3000  // Send heartbeat / telemetry every 3s

#endif // CONFIG_H
