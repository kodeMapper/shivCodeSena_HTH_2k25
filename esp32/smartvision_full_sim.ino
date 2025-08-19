#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
#include <WiFiClientSecure.h>
#include <esp32-hal-ledc.h>
#endif
#include "config.h"

// Fallbacks if not compiling for ESP32: stub LEDC APIs so build doesn't fail.
#if !defined(ESP32) && !defined(ARDUINO_ARCH_ESP32)
#include <Arduino.h>
static void ledcSetup(int, int, int) {}
static void ledcAttachPin(int pin, int) { pinMode(pin, OUTPUT); }
static void ledcWrite(int ch, int duty) {
  // Map channels to pins and drive as simple on/off
  int pin = (ch == LEDC_CH_LEFT) ? VIBE_LEFT_PIN : VIBE_RIGHT_PIN;
  digitalWrite(pin, duty > 0 ? HIGH : LOW);
}
#ifndef IRAM_ATTR
#define IRAM_ATTR
#endif
#endif

// Full SmartVision simulator:
// - GPS: random coords every 10s
// - Steps: +1 every 5s
// - Fall: auto after 30s OR failsafe when no button press for 10s
// - Lidar: simulated obstacle triggers haptics
// - Water: simulated water triggers haptics

static uint32_t tWiFiRetry = 0;
static uint32_t tGps = 0;
static uint32_t tSteps = 0;
static uint32_t bootMs = 0;
static uint32_t lastButtonPress = 0;
static int steps = 0;

static float frand(float a, float b) { return a + (float)random(0, 10000) / 10000.0f * (b - a); }

static void ledcInit() {
  ledcSetup(LEDC_CH_LEFT,  LEDC_FREQ_HZ, LEDC_RES_BITS);
  ledcSetup(LEDC_CH_RIGHT, LEDC_FREQ_HZ, LEDC_RES_BITS);
  ledcAttachPin(VIBE_LEFT_PIN,  LEDC_CH_LEFT);
  ledcAttachPin(VIBE_RIGHT_PIN, LEDC_CH_RIGHT);
  ledcWrite(LEDC_CH_LEFT,  0);
  ledcWrite(LEDC_CH_RIGHT, 0);
}

static void hapticsPulseBoth(uint32_t ms) {
  ledcWrite(LEDC_CH_LEFT,  VIBE_DUTY);
  ledcWrite(LEDC_CH_RIGHT, VIBE_DUTY);
  delay(ms);
  ledcWrite(LEDC_CH_LEFT,  0);
  ledcWrite(LEDC_CH_RIGHT, 0);
}

static void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - tWiFiRetry < 2000) return;
  tWiFiRetry = millis();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect timeout");
  }
}

static bool httpPostJson(const String& url, const String& body) {
  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
  if (String(API_BASE).startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();
    http.begin(client, url);
  } else {
    http.begin(url);
  }
#else
  http.begin(url);
#endif
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);
  int code = http.POST(body);
  Serial.printf("POST %s => %d\n", url.c_str(), code);
  if (code > 0) Serial.println(http.getString());
  http.end();
  return code >= 200 && code < 300;
}

static void postLocation() {
  DynamicJsonDocument doc(256);
  doc["lat"] = BASE_LAT + frand(-COORD_VARIATION, COORD_VARIATION);
  doc["lng"] = BASE_LNG + frand(-COORD_VARIATION, COORD_VARIATION);
  String body; serializeJson(doc, body);
  Serial.println("---- HTTP POST (Location) ----");
  Serial.print("URL: "); Serial.println(API_URL_LOCATION);
  Serial.println("Headers:");
  Serial.println("  Content-Type: application/json");
  Serial.print("  X-Device-ID: "); Serial.println(DEVICE_ID);
  Serial.print("Body: "); Serial.println(body);
  httpPostJson(API_URL_LOCATION, body);
}

static void postSteps() {
  steps += 1;
  DynamicJsonDocument doc(128);
  doc["steps"] = steps;
  String body; serializeJson(doc, body);
  Serial.println("---- HTTP POST (Steps) ----");
  Serial.print("URL: "); Serial.println(API_URL_STEPS);
  Serial.println("Headers:");
  Serial.println("  Content-Type: application/json");
  Serial.print("  X-Device-ID: "); Serial.println(DEVICE_ID);
  Serial.print("Body: "); Serial.println(body);
  httpPostJson(API_URL_STEPS, body);
}

static void postFall(bool fell) {
  DynamicJsonDocument doc(128);
  doc["fell"] = fell;
  String body; serializeJson(doc, body);
  Serial.println("---- HTTP POST (Fall) ----");
  Serial.print("URL: "); Serial.println(API_URL_FALL);
  Serial.println("Headers:");
  Serial.println("  Content-Type: application/json");
  Serial.print("  X-Device-ID: "); Serial.println(DEVICE_ID);
  Serial.print("Body: "); Serial.println(body);
  httpPostJson(API_URL_FALL, body);
}

static bool simulateLidarObstacle() {
  // If LIDAR_AN_PIN is floating, read will be noisy. We'll simulate with random chance of obstacle ~5% each loop.
  int raw = analogRead(LIDAR_AN_PIN); // 0..4095 typical
  bool wiringPresent = raw != 0 && raw != 4095; // weak heuristic
  if (wiringPresent) {
    // Suppose low value means close obstacle
    return raw < 800; // tune threshold based on your sensor
  }
  // Simulated: ~5% chance
  return random(0, 100) < 5;
}

static bool simulateWaterDetected() {
  int raw = analogRead(WATER_AN_PIN);
  bool wiringPresent = raw != 0 && raw != 4095;
  if (wiringPresent) {
    // Suppose high value means water contact (depends on module)
    return raw > 2500; // tune threshold
  }
  // Simulated: ~3% chance
  return random(0, 100) < 3;
}

void IRAM_ATTR onButtonPress() {
  lastButtonPress = millis();
}

void setup() {
  Serial.begin(115200);
  delay(200);
  // Seed RNG
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
  randomSeed((uint32_t)esp_random());
#else
  randomSeed(micros());
#endif

  pinMode(PUSH_BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PUSH_BUTTON_PIN), onButtonPress, FALLING);
  ledcInit();

  connectWiFi();

  bootMs = millis();
  lastButtonPress = millis();
  Serial.println("==== ESP32 SmartVision Full Simulator ====");
  Serial.print("API_BASE: "); Serial.println(API_BASE);
  Serial.print("DEVICE_ID: "); Serial.println(DEVICE_ID);
}

void loop() {
  uint32_t now = millis();

  // GPS every 10s
  if (now - tGps >= GPS_POST_INTERVAL_MS) {
    tGps = now;
    postLocation();
  }

  // Steps every 5s
  if (now - tSteps >= STEPS_POST_INTERVAL_MS) {
    tSteps = now;
    postSteps();
  }

  // Auto fall after 30s (one-time)
  if (now - bootMs >= AUTO_FALL_AFTER_MS) {
    static bool sentAuto = false;
    if (!sentAuto) { sentAuto = true; postFall(true); }
  }

  // Button failsafe: if not pressed for BUTTON_FAILSAFE_MS, treat as fall alert (repeat allowed every interval)
  if (now - lastButtonPress >= BUTTON_FAILSAFE_MS) {
    static uint32_t lastFailPost = 0;
    if (now - lastFailPost >= BUTTON_FAILSAFE_MS) {
      lastFailPost = now;
      postFall(true);
    }
  }

  // Lidar obstacle => haptics
  if (simulateLidarObstacle()) {
    Serial.println("Obstacle detected -> haptics");
    hapticsPulseBoth(180);
  }

  // Water detect => haptics (shorter)
  if (simulateWaterDetected()) {
    Serial.println("Water detected -> haptics");
    hapticsPulseBoth(120);
  }

  delay(20);
}
