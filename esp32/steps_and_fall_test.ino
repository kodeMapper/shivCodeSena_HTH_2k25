#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
#include <WiFiClientSecure.h>
#endif
#include "config.h"

// Steps + fall simulator
// - Sends steps every STEPS_POST_INTERVAL_MS, increment by 1
// - After AUTO_FALL_AFTER_MS, sends fell=true

static uint32_t lastStepsPost = 0;
static uint32_t bootMs = 0;
static int steps = 0;

static void connectWiFi() {
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

static bool postSteps(int count) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
  if (String(API_BASE).startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();
    http.begin(client, API_URL_STEPS);
  } else {
    http.begin(API_URL_STEPS);
  }
#else
  http.begin(API_URL_STEPS);
#endif
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);

  DynamicJsonDocument doc(256);
  doc["steps"] = count;

  String body; serializeJson(doc, body);
  Serial.println("---- HTTP POST (Steps) ----");
  Serial.print("URL: "); Serial.println(API_URL_STEPS);
  Serial.println("Headers:");
  Serial.println("  Content-Type: application/json");
  Serial.print("  X-Device-ID: "); Serial.println(DEVICE_ID);
  Serial.print("Body: "); Serial.println(body);
  int code = http.POST(body);
  Serial.printf("POST /update-steps => %d (steps=%d)\n", code, count);
  if (code > 0) Serial.println(http.getString());
  http.end();
  return code >= 200 && code < 300;
}

static bool postFall(bool fell) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
  if (String(API_BASE).startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();
    http.begin(client, API_URL_FALL);
  } else {
    http.begin(API_URL_FALL);
  }
#else
  http.begin(API_URL_FALL);
#endif
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);

  DynamicJsonDocument doc(128);
  doc["fell"] = fell;
  String body; serializeJson(doc, body);
  Serial.println("---- HTTP POST (Fall) ----");
  Serial.print("URL: "); Serial.println(API_URL_FALL);
  Serial.println("Headers:");
  Serial.println("  Content-Type: application/json");
  Serial.print("  X-Device-ID: "); Serial.println(DEVICE_ID);
  Serial.print("Body: "); Serial.println(body);
  int code = http.POST(body);
  Serial.printf("POST /fall-detected => %d (fell=%s)\n", code, fell ? "true" : "false");
  if (code > 0) Serial.println(http.getString());
  http.end();
  return code >= 200 && code < 300;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  connectWiFi();
  bootMs = millis();
  Serial.println("==== ESP32 Steps & Fall Test ====");
  Serial.print("API_BASE: "); Serial.println(API_BASE);
  Serial.print("DEVICE_ID: "); Serial.println(DEVICE_ID);
}

void loop() {
  uint32_t now = millis();

  if (now - lastStepsPost >= STEPS_POST_INTERVAL_MS) {
    lastStepsPost = now;
    steps += 1;
    postSteps(steps);
  }

  if (now - bootMs >= AUTO_FALL_AFTER_MS) {
    // fire once
    static bool sent = false;
    if (!sent) {
      sent = true;
      postFall(true);
    }
  }
}
