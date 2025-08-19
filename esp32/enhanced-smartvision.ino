#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <VL53L0X.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "BluetoothSerial.h"
#include <base64.h>
#include <Preferences.h>

// Device Configuration
const String DEVICE_ID = "ESP32_SmartVision_001"; // Unique device identifier
const String FIRMWARE_VERSION = "2.0.0";

// WiFi Configuration with Fallback
struct WiFiCredentials {
  const char* ssid;
  const char* password;
};

WiFiCredentials wifiNetworks[] = {
  {"Mehar", "244466666"},
  {"Backup_Network", "backup_password"},
  {"Mobile_Hotspot", "mobile_password"}
};
const int numNetworks = sizeof(wifiNetworks) / sizeof(wifiNetworks[0]);

// Enhanced Server Configuration
const char* baseServerUrl = "http://192.168.55.143:3000/api";
const char* backupServerUrl = "https://your-backup-server.com/api"; // Fallback server

// API Endpoints
String locationEndpoint = String(baseServerUrl) + "/update-location";
String stepsEndpoint = String(baseServerUrl) + "/update-steps";
String emergencyEndpoint = String(baseServerUrl) + "/emergency-alert";
String healthEndpoint = String(baseServerUrl) + "/health";

// Twilio Configuration (Enhanced) - Replace with your actual credentials
const char* account_sid = "YOUR_TWILIO_ACCOUNT_SID";
const char* auth_token = "YOUR_TWILIO_AUTH_TOKEN";
const char* from_number = "YOUR_TWILIO_PHONE_NUMBER";
const char* to_number = "YOUR_EMERGENCY_CONTACT_NUMBER";

// Network and Communication
BluetoothSerial SerialBT;
Preferences preferences;
HTTPClient http;
WiFiClientSecure secureClient;

// GPS Configuration
#define RXPin 4
#define TXPin 2
#define GPSBaud 9600
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// Sensor Pins and Objects
#define WATER_SENSOR_PIN 34
#define VIBRATION_MOTOR_1 25
#define VIBRATION_MOTOR_2 26
#define SDA_VL53 21
#define SCL_VL53 22
#define SDA_MPU 32
#define SCL_MPU 33

// Button Configuration for SOS
const int buttonPin1 = 18;
const int buttonPin2 = 17;
const int buttonPin3 = 13;

// Sensor Objects
TwoWire I2C_MPU = TwoWire(1);
Adafruit_MPU6050 mpu;
VL53L0X sensor;

// Enhanced State Management
struct DeviceState {
  // Sensor readings
  bool waterDetected = false;
  bool obstacleDetected = false;
  int distance = 0;
  int waterLevel = 0;
  
  // Location data
  double latitude = 0.0;
  double longitude = 0.0;
  double accuracy = 0.0;
  bool gpsValid = false;
  
  // Pedometer
  int stepCount = 0;
  float lastAccelX = 0.0;
  unsigned long lastStepTime = 0;
  
  // System status
  bool systemActive = true;
  bool emergencyMode = false;
  unsigned long lastHeartbeat = 0;
  int wifiRetryCount = 0;
  
  // SOS system
  unsigned long lastButtonPress = 0;
  bool sosTimerActive = false;
  bool sosTriggered = false;
  
  // Performance metrics
  unsigned long totalUptime = 0;
  int successfulTransmissions = 0;
  int failedTransmissions = 0;
};

DeviceState deviceState;

// Enhanced Configuration
struct Config {
  const float stepThreshold = 1.2;
  const int stepDelay = 300;
  const int obstacleThreshold = 500; // mm
  const int waterThreshold = 1900;
  const unsigned long heartbeatInterval = 30000; // 30 seconds
  const unsigned long sosTimeout = 10000; // 10 seconds
  const unsigned long sosCancelWindow = 10000; // 10 seconds to cancel
  const unsigned long motorDuration = 1000; // 1 second
  const int maxRetries = 3;
  const unsigned long retryDelay = 5000; // 5 seconds
  const unsigned long wifiTimeout = 10000; // 10 seconds
} config;

// Error tracking
struct ErrorMetrics {
  int wifiErrors = 0;
  int httpErrors = 0;
  int sensorErrors = 0;
  int gpsErrors = 0;
  unsigned long lastError = 0;
} errorMetrics;

void setup() {
  Serial.begin(115200);
  SerialBT.begin("SmartVision_" + DEVICE_ID);
  
  // Initialize preferences for persistent storage
  preferences.begin("smartvision", false);
  deviceState.stepCount = preferences.getInt("stepCount", 0);
  
  Serial.println("🚀 SmartVision Safety Device v" + FIRMWARE_VERSION);
  Serial.println("Device ID: " + DEVICE_ID);
  
  initializePins();
  initializeSensors();
  connectToWiFi();
  
  // Send startup notification
  sendHeartbeat();
  
  Serial.println("✅ System initialization complete");
  logToBluetooth("System Ready - " + DEVICE_ID);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Core sensor readings
  readSensors();
  
  // Process GPS data
  processGPS();
  
  // Handle pedometer
  processPedometer();
  
  // Handle SOS system
  handleSOS();
  
  // Control vibration feedback
  controlVibrationMotor();
  
  // Communication tasks
  if (currentTime - deviceState.lastHeartbeat > config.heartbeatInterval) {
    sendDataToServer();
    sendHeartbeat();
    deviceState.lastHeartbeat = currentTime;
  }
  
  // Status reporting
  reportStatusToBluetooth();
  
  // Check WiFi connection
  maintainConnectivity();
  
  // Save critical data periodically
  if (currentTime % 60000 == 0) { // Every minute
    preferences.putInt("stepCount", deviceState.stepCount);
  }
  
  delay(100); // Main loop delay
}

void initializePins() {
  pinMode(VIBRATION_MOTOR_1, OUTPUT);
  pinMode(VIBRATION_MOTOR_2, OUTPUT);
  pinMode(WATER_SENSOR_PIN, INPUT);
  pinMode(buttonPin1, INPUT_PULLUP);
  pinMode(buttonPin2, INPUT_PULLUP);
  pinMode(buttonPin3, INPUT_PULLUP);
  
  digitalWrite(VIBRATION_MOTOR_1, LOW);
  digitalWrite(VIBRATION_MOTOR_2, LOW);
}

void initializeSensors() {
  // Initialize VL53L0X
  Wire.begin(SDA_VL53, SCL_VL53, 100000);
  sensor.setBus(&Wire);
  if (!sensor.init()) {
    Serial.println("❌ VL53L0X initialization failed!");
    errorMetrics.sensorErrors++;
    logToBluetooth("ERROR: Distance sensor failed");
  } else {
    Serial.println("✅ VL53L0X initialized");
  }
  
  // Initialize MPU6050
  I2C_MPU.begin(SDA_MPU, SCL_MPU, 100000);
  if (!mpu.begin(0x68, &I2C_MPU)) {
    Serial.println("❌ MPU6050 initialization failed!");
    errorMetrics.sensorErrors++;
    logToBluetooth("ERROR: Motion sensor failed");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setGyroRange(MPU6050_RANGE_250_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("✅ MPU6050 initialized");
  }
  
  // Initialize GPS
  gpsSerial.begin(GPSBaud, SERIAL_8N1, RXPin, TXPin);
  Serial.println("✅ GPS initialized");
}

void connectToWiFi() {
  Serial.println("🔌 Connecting to WiFi...");
  
  for (int i = 0; i < numNetworks; i++) {
    Serial.printf("Trying network: %s\n", wifiNetworks[i].ssid);
    WiFi.begin(wifiNetworks[i].ssid, wifiNetworks[i].password);
    
    unsigned long startTime = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < config.wifiTimeout) {
      delay(500);
      Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n✅ Connected to %s\n", wifiNetworks[i].ssid);
      Serial.printf("IP address: %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("Signal strength: %d dBm\n", WiFi.RSSI());
      logToBluetooth("WiFi Connected: " + String(wifiNetworks[i].ssid));
      return;
    }
    
    Serial.printf("\n❌ Failed to connect to %s\n", wifiNetworks[i].ssid);
    WiFi.disconnect();
  }
  
  Serial.println("❌ Failed to connect to any WiFi network");
  errorMetrics.wifiErrors++;
  logToBluetooth("ERROR: WiFi connection failed");
}

void readSensors() {
  // Read distance sensor
  if (sensor.init()) {
    deviceState.distance = sensor.readRangeSingleMillimeters();
    deviceState.obstacleDetected = (deviceState.distance < config.obstacleThreshold && deviceState.distance > 0);
  }
  
  // Read water sensor
  deviceState.waterLevel = analogRead(WATER_SENSOR_PIN);
  deviceState.waterDetected = (deviceState.waterLevel > config.waterThreshold);
  
  // Trigger vibration for immediate feedback
  if (deviceState.obstacleDetected) {
    activateVibrationMotor(VIBRATION_MOTOR_2);
  }
  
  if (deviceState.waterDetected) {
    activateVibrationMotor(VIBRATION_MOTOR_1);
  }
}

void processGPS() {
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    if (gps.encode(c)) {
      if (gps.location.isValid()) {
        deviceState.latitude = gps.location.lat();
        deviceState.longitude = gps.location.lng();
        deviceState.accuracy = gps.hdop.hdop();
        deviceState.gpsValid = true;
      } else {
        deviceState.gpsValid = false;
        errorMetrics.gpsErrors++;
      }
    }
  }
}

void processPedometer() {
  sensors_event_t a, g, temp;
  if (mpu.getEvent(&a, &g, &temp)) {
    float accelX = a.acceleration.x;
    unsigned long currentTime = millis();
    
    // Enhanced step detection with noise filtering
    if ((deviceState.lastAccelX < config.stepThreshold) && 
        (accelX > config.stepThreshold) && 
        (currentTime - deviceState.lastStepTime > config.stepDelay)) {
      
      deviceState.stepCount++;
      deviceState.lastStepTime = currentTime;
      
      Serial.printf("👟 Step detected! Total: %d\n", deviceState.stepCount);
      logToBluetooth("Steps: " + String(deviceState.stepCount));
    }
    
    deviceState.lastAccelX = accelX;
  }
}

void handleSOS() {
  if (!deviceState.systemActive) {
    checkForRestart();
    return;
  }
  
  int button1 = digitalRead(buttonPin1);
  int button2 = digitalRead(buttonPin2);
  
  // Button press detection
  if (button1 == LOW || button2 == LOW) {
    deviceState.lastButtonPress = millis();
    deviceState.sosTimerActive = true;
    Serial.println("🔘 Button pressed - SOS timer started");
  }
  
  // SOS timeout check
  if (deviceState.sosTimerActive && 
      (millis() - deviceState.lastButtonPress > config.sosTimeout)) {
    
    Serial.println("🚨 SOS timeout reached - Starting emergency sequence");
    logToBluetooth("EMERGENCY: SOS sequence started");
    
    // Emergency vibration pattern
    for (int i = 0; i < 3; i++) {
      digitalWrite(VIBRATION_MOTOR_1, HIGH);
      digitalWrite(VIBRATION_MOTOR_2, HIGH);
      delay(500);
      digitalWrite(VIBRATION_MOTOR_1, LOW);
      digitalWrite(VIBRATION_MOTOR_2, LOW);
      delay(300);
    }
    
    // Check for cancellation
    if (checkSOSCancellation()) {
      Serial.println("🛑 SOS cancelled by user");
      logToBluetooth("SOS cancelled");
      deviceState.systemActive = false;
    } else {
      // Trigger emergency alert
      triggerEmergencyAlert();
      deviceState.sosTriggered = true;
      deviceState.systemActive = false;
    }
    
    deviceState.sosTimerActive = false;
  }
}

bool checkSOSCancellation() {
  unsigned long startTime = millis();
  unsigned long buttonPressStart = 0;
  
  while (millis() - startTime < config.sosCancelWindow) {
    if (digitalRead(buttonPin3) == LOW) {
      if (buttonPressStart == 0) {
        buttonPressStart = millis();
      }
      if (millis() - buttonPressStart >= 2000) {
        return true; // SOS cancelled
      }
    } else {
      buttonPressStart = 0;
    }
    delay(100);
  }
  
  return false; // SOS not cancelled
}

void checkForRestart() {
  if (digitalRead(buttonPin3) == LOW) {
    static unsigned long buttonPressStart = 0;
    if (buttonPressStart == 0) {
      buttonPressStart = millis();
    }
    if (millis() - buttonPressStart >= 2000) {
      Serial.println("🔄 System restarting...");
      logToBluetooth("System restarting");
      deviceState.systemActive = true;
      deviceState.sosTriggered = false;
      buttonPressStart = 0;
    }
  }
}

void triggerEmergencyAlert() {
  Serial.println("🚨 EMERGENCY ALERT TRIGGERED!");
  logToBluetooth("EMERGENCY ALERT ACTIVATED");
  
  // Send emergency notification to server
  sendEmergencyAlert();
  
  // Send SMS alerts
  for (int i = 0; i < 5; i++) {
    String emergencyMessage = "EMERGENCY ALERT from " + DEVICE_ID + 
                            ". Location: " + String(deviceState.latitude, 6) + 
                            ", " + String(deviceState.longitude, 6) + 
                            ". Please respond immediately.";
    sendSMS(emergencyMessage.c_str());
    delay(2000); // Delay between SMS
  }
}

void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping data transmission");
    errorMetrics.wifiErrors++;
    return;
  }
  
  // Send location data
  if (deviceState.gpsValid) {
    sendLocationData();
  }
  
  // Send step data
  sendStepData();
}

void sendLocationData() {
  DynamicJsonDocument doc(1024);
  doc["lat"] = deviceState.latitude;
  doc["lng"] = deviceState.longitude;
  doc["accuracy"] = deviceState.accuracy;
  doc["timestamp"] = millis();
  doc["deviceId"] = DEVICE_ID;
  
  String payload;
  serializeJson(doc, payload);
  
  if (sendHTTPRequest(locationEndpoint, payload)) {
    Serial.printf("📡 Location sent: %.6f, %.6f\n", deviceState.latitude, deviceState.longitude);
    deviceState.successfulTransmissions++;
  } else {
    errorMetrics.httpErrors++;
    deviceState.failedTransmissions++;
  }
}

void sendStepData() {
  DynamicJsonDocument doc(512);
  doc["steps"] = deviceState.stepCount;
  doc["timestamp"] = millis();
  doc["deviceId"] = DEVICE_ID;
  
  String payload;
  serializeJson(doc, payload);
  
  if (sendHTTPRequest(stepsEndpoint, payload)) {
    Serial.printf("👟 Steps sent: %d\n", deviceState.stepCount);
    deviceState.successfulTransmissions++;
  } else {
    errorMetrics.httpErrors++;
    deviceState.failedTransmissions++;
  }
}

void sendEmergencyAlert() {
  DynamicJsonDocument doc(1024);
  doc["type"] = "emergency";
  doc["message"] = "Emergency SOS triggered from device " + DEVICE_ID;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  
  if (deviceState.gpsValid) {
    JsonObject location = doc.createNestedObject("location");
    location["lat"] = deviceState.latitude;
    location["lng"] = deviceState.longitude;
    location["accuracy"] = deviceState.accuracy;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  sendHTTPRequest(emergencyEndpoint, payload);
}

void sendHeartbeat() {
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = DEVICE_ID;
  doc["firmware"] = FIRMWARE_VERSION;
  doc["uptime"] = millis();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["successfulTransmissions"] = deviceState.successfulTransmissions;
  doc["failedTransmissions"] = deviceState.failedTransmissions;
  
  // Add error metrics
  JsonObject errors = doc.createNestedObject("errors");
  errors["wifi"] = errorMetrics.wifiErrors;
  errors["http"] = errorMetrics.httpErrors;
  errors["sensors"] = errorMetrics.sensorErrors;
  errors["gps"] = errorMetrics.gpsErrors;
  
  String payload;
  serializeJson(doc, payload);
  
  sendHTTPRequest(healthEndpoint, payload);
}

bool sendHTTPRequest(String endpoint, String payload) {
  HTTPClient http;
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);
  http.setTimeout(10000); // 10 second timeout
  
  int httpCode = http.POST(payload);
  bool success = (httpCode >= 200 && httpCode < 300);
  
  if (success) {
    Serial.printf("✅ HTTP %d: %s\n", httpCode, http.getString().c_str());
  } else {
    Serial.printf("❌ HTTP %d: %s\n", httpCode, http.errorToString(httpCode).c_str());
  }
  
  http.end();
  return success;
}

void maintainConnectivity() {
  if (WiFi.status() != WL_CONNECTED) {
    deviceState.wifiRetryCount++;
    Serial.println("🔌 WiFi disconnected, attempting reconnection...");
    logToBluetooth("WiFi reconnecting...");
    connectToWiFi();
  }
}

void activateVibrationMotor(int motorPin) {
  static unsigned long motorStartTime = 0;
  static bool motorActive = false;
  
  if (!motorActive) {
    digitalWrite(motorPin, HIGH);
    motorActive = true;
    motorStartTime = millis();
  }
  
  if (motorActive && (millis() - motorStartTime >= config.motorDuration)) {
    digitalWrite(VIBRATION_MOTOR_1, LOW);
    digitalWrite(VIBRATION_MOTOR_2, LOW);
    motorActive = false;
  }
}

void controlVibrationMotor() {
  // This function is called from the main loop to handle motor timing
  activateVibrationMotor(0); // Call with dummy parameter to handle timing
}

void reportStatusToBluetooth() {
  static unsigned long lastReport = 0;
  
  if (millis() - lastReport > 5000) { // Report every 5 seconds
    String status = "Status: ";
    
    if (deviceState.waterDetected && deviceState.obstacleDetected) {
      status += "BOTH Water & Obstacle Detected!";
    } else if (deviceState.waterDetected) {
      status += "Water Detected!";
    } else if (deviceState.obstacleDetected) {
      status += "Obstacle Detected!";
    } else {
      status += "All Clear";
    }
    
    status += " | Steps: " + String(deviceState.stepCount);
    status += " | GPS: " + (deviceState.gpsValid ? "Valid" : "Invalid");
    status += " | WiFi: " + (WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    
    logToBluetooth(status);
    lastReport = millis();
  }
}

void logToBluetooth(String message) {
  String timestamp = String(millis() / 1000);
  SerialBT.println("[" + timestamp + "s] " + message + "#");
  Serial.println("[BT] " + message);
}

void sendSMS(const char* message) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected! SMS cannot be sent.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // For development only
  
  if (!client.connect("api.twilio.com", 443)) {
    Serial.println("❌ Connection to Twilio failed!");
    return;
  }

  HTTPClient http;
  String url = "https://api.twilio.com/2010-04-01/Accounts/" + String(account_sid) + "/Messages.json";
  
  http.begin(client, url);
  
  String auth = String(account_sid) + ":" + String(auth_token);
  String auth_base64 = base64::encode(auth);
  auth_base64.replace("\n", "");
  
  http.addHeader("Authorization", "Basic " + auth_base64);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  
  String postData = "To=" + String(to_number) + "&From=" + String(from_number) + "&Body=" + String(message);
  
  int httpResponseCode = http.POST(postData);
  
  if (httpResponseCode > 0) {
    Serial.println("✅ SMS Sent Successfully!");
    Serial.println(http.getString());
  } else {
    Serial.printf("❌ SMS Failed: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}
