#pragma once

// ====== WiFi ======
// Edit these before flashing
static const char* WIFI_SSID = "Mehar";     // your WiFi SSID
static const char* WIFI_PASS = "244466666";  // your WiFi password

// ====== Backend API ======
// Preferred: use your local server during development for easier debugging
// Example: http://192.168.1.10:3000
// Or use your deployed URL (HTTPS) e.g. https://dipex-gps.vercel.app
// If using HTTPS, we set the client to insecure for testing convenience.
// NOTE: For production, pin a certificate instead of setInsecure().
static const char* API_BASE = "https://dipex-gps.vercel.app"; // change to your local http URL if needed

// Device identity header expected by backend (X-Device-ID)
// Must match an existing device id in your backend (e.g., "aneesh_bhaiyya").
static const char* DEVICE_ID = "aneesh_bhaiyya";

// ====== GPS Simulation ======
// Center around Nagpur (default lat/lng requested)
static const double BASE_LAT = 21.17662638279427; 
static const double BASE_LNG = 79.0616383891541; 
// Random variation in degrees (~0.001 ~ 111m latitude)
static const double COORD_VARIATION = 0.0025;  // ~275m radius

// ====== Timings (ms) ======
static const uint32_t GPS_POST_INTERVAL_MS   = 10 * 1000; // 10s
static const uint32_t STEPS_POST_INTERVAL_MS = 5  * 1000; // 5s
static const uint32_t AUTO_FALL_AFTER_MS     = 30 * 1000; // 30s
static const uint32_t BUTTON_FAILSAFE_MS     = 10 * 1000; // 10s without press => fall

// ====== Pins ======
// Push button: use INPUT_PULLUP (connect button between pin and GND)
static const int PUSH_BUTTON_PIN = 14; // change to a free GPIO you have a button on

// Vibration motors (haptics) - any PWM-capable pins
static const int VIBE_LEFT_PIN  = 25; // adjust to your wiring
static const int VIBE_RIGHT_PIN = 26; // adjust to your wiring

// Optional sensor pins (if you want to wire real sensors). Otherwise we will simulate.
// LIDAR: If using analog-distance or a simple digital threshold sensor, define here. Otherwise we simulate.
static const int LIDAR_AN_PIN = 34; // ADC1_CH6 (input only). Leave unconnected to use simulation.
// Water sensor: analog pin or digital threshold
static const int WATER_AN_PIN = 35; // ADC1_CH7 (input only). Leave unconnected to use simulation.

// ====== Haptics ======
static const int LEDC_CH_LEFT  = 0;
static const int LEDC_CH_RIGHT = 1;
static const int LEDC_FREQ_HZ  = 200;   // low freq for vibration motor
static const int LEDC_RES_BITS = 8;     // 0..255 duty
static const int VIBE_DUTY     = 180;   // vibration intensity

// ====== Helper macros ======
#define API_URL_LOCATION String(API_BASE) + "/api/update-location"
#define API_URL_STEPS    String(API_BASE) + "/api/update-steps"
#define API_URL_FALL     String(API_BASE) + "/api/fall-detected"
