#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
#include <WiFiClientSecure.h>
#endif
#include "config.h"

// Simple GPS-only simulator: posts random coordinates around BASE_LAT/LNG every GPS_POST_INTERVAL_MS

static uint32_t lastPost = 0;

static float frand(float a, float b) {
  return a + (float)random(0, 10000) / 10000.0f * (b - a);
}

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

void setup() {
  Serial.begin(115200);
  delay(200);
  randomSeed((uint32_t)esp_random());
  connectWiFi();
  Serial.println("==== ESP32 GPS Random Test ====");
  Serial.print("API_BASE: "); Serial.println(API_BASE);
  Serial.print("DEVICE_ID: "); Serial.println(DEVICE_ID);
}

static bool postLocation(double lat, double lng) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
  if (String(API_BASE).startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();
    http.begin(client, API_URL_LOCATION);
  } else {
    http.begin(API_URL_LOCATION);
  }
#else
  http.begin(API_URL_LOCATION);
#endif
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);

  DynamicJsonDocument doc(256);
  doc["lat"] = lat;
  doc["lng"] = lng;
  String body; serializeJson(doc, body);

  Serial.println("---- HTTP POST (Location) ----");
  Serial.print("URL: "); Serial.println(API_URL_LOCATION);
  Serial.println("Headers:");
  Serial.println("  Content-Type: application/json");
  Serial.print("  X-Device-ID: "); Serial.println(DEVICE_ID);
  Serial.print("Body: "); Serial.println(body);

  int code = http.POST(body);
  Serial.printf("POST /update-location => %d\n", code);
  if (code > 0) Serial.println(http.getString());
  http.end();
  return code >= 200 && code < 300;
}

void loop() {
  uint32_t now = millis();
  if (now - lastPost >= GPS_POST_INTERVAL_MS) {
    lastPost = now;
    double lat = BASE_LAT + frand(-COORD_VARIATION, COORD_VARIATION);
    double lng = BASE_LNG + frand(-COORD_VARIATION, COORD_VARIATION);
    postLocation(lat, lng);
  }
}
