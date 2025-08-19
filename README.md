# Fall Detection System - SmartVision Enhanced Platform

![SmartVision Logo](https://img.shields.io/badge/SmartVision-v2.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 📋 Problem Statement

**Problem ID:** HTH-02  
**Problem Title:** Fall Detection System

**Problem Description:**  
Create a wearable system using accelerometer sensing to detect falls and send alerts, especially for elderly care. This system addresses the critical need for immediate assistance when elderly individuals or people with mobility issues experience falls, which can lead to serious injuries or be life-threatening if help doesn't arrive quickly.

## 🎯 Solution Approach

Our SmartVision Enhanced Platform provides a comprehensive fall detection and emergency response system that combines:

1. **Advanced Sensor Fusion**: Multi-sensor approach using MPU6050 accelerometer/gyroscope for accurate fall detection with minimal false positives
2. **Intelligent Fall Algorithm**: Machine learning-based detection that distinguishes between normal activities and actual falls
3. **Immediate Alert System**: Automated emergency notifications via SMS, email, and mobile app alerts to caregivers and emergency contacts
4. **GPS Location Tracking**: Real-time location sharing for emergency responders and family members
5. **Comprehensive Safety Platform**: Integration with existing safety infrastructure including obstacle detection and navigation assistance

## 🌟 Overview

SmartVision is an enhanced IoT-based fall detection and family safety tracking system designed for elderly care and individuals with mobility challenges. The system combines ESP32 hardware with advanced accelerometer sensing, real-time GPS tracking, obstacle detection, and automated emergency response capabilities.

### 🎯 Key Features

#### Fall Detection Core Features
- **Advanced Fall Detection** - MPU6050 accelerometer/gyroscope with ML-based fall recognition algorithms
- **Impact Analysis** - Multi-axis acceleration monitoring to detect sudden impacts and orientation changes
- **Activity Classification** - Distinguishes between normal activities (sitting, walking, running) and fall events
- **False Positive Reduction** - Smart algorithms to minimize false alarms from normal activities
- **Automatic Alert Generation** - Immediate emergency notifications upon confirmed fall detection
- **Manual Override** - User can cancel false alarms within a configurable time window

#### Hardware Features (ESP32)
- **Fall Detection Sensors** - MPU6050 6-axis accelerometer/gyroscope for precise motion analysis
- **GPS Tracking** - Real-time location monitoring for emergency response
- **Obstacle Detection** - VL53L0X LiDAR sensor for immediate hazard detection
- **Water Detection** - Analog sensor for water hazard alerts
- **Step Counter** - Activity tracking and mobility monitoring
- **SOS System** - Three-button emergency activation with SMS alerts
- **Vibration Feedback** - Dual motors for tactile warnings and notifications
- **Bluetooth Communication** - Mobile app connectivity and data synchronization

#### Backend Features (Enhanced)
- **🛡️ Security** - Device authentication, rate limiting, input validation
- **📊 Fall Analytics** - Fall incident tracking, health monitoring, usage statistics
- **🔄 Real-time Updates** - Live location and fall detection monitoring
- **🚨 Emergency Response** - Automated alert system with Twilio integration
- **� Caregiver Dashboard** - Web-based monitoring interface for family members and caregivers
- **📱 Family Notifications** - Multi-channel alert system (SMS, email, app notifications)
- **🔧 Device Management** - Multi-device support with health monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- ESP32 development board with fall detection sensors
- WiFi network access
- Twilio account (for SMS alerts)
- Arduino IDE with ESP32 core

### 1. Clone and Setup
```bash
git clone <repository-url>
cd "ShivCodeSena_HTH_2k25"
npm install
```

### 2. Hardware Setup
```bash
# Flash the ESP32 with fall detection firmware
# Open Arduino IDE
# Load esp32/enhanced-smartvision.ino
# Configure WiFi credentials in config.h
# Upload to ESP32 device
```

### 3. Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# - WiFi credentials
# - Twilio credentials for SMS alerts
# - Emergency contact numbers
# - Fall detection sensitivity settings
```

### 4. Start the System
```bash
# Windows
./start.bat

# Linux/macOS
chmod +x start.sh
./start.sh

# Or directly with npm
npm start
```

### 5. Test Fall Detection
```bash
# Test core fall detection functionality
node test-core-api.js

# Test boundary violations and safety zones
node test-boundary-violation.js

# Test with external APIs (requires internet)
node test-api.js
```

### 6. Access the Dashboard
- **API Health Check**: http://localhost:3000/api/health
- **Fall Detection Dashboard**: http://localhost:3000
- **API Documentation**: See `docs/API.md`

## � Required Components

### Hardware Components
| Component | Model/Type | Purpose | Specifications |
|-----------|------------|---------|----------------|
| **Microcontroller** | ESP32 Development Board | Main processing unit | WiFi + Bluetooth, 32-bit dual-core |
| **Fall Detection Sensor** | MPU6050 IMU | Accelerometer/Gyroscope | 6-axis, ±2g to ±16g range |
| **GPS Module** | NEO-6M/NEO-8M | Location tracking | UART communication |
| **Obstacle Detection** | VL53L0X LiDAR | Hazard detection | 2m range, I2C interface |
| **Water Sensor** | Analog Water Detection | Liquid hazard detection | Analog output |
| **Vibration Motors** | Coin Vibration Motor (2x) | Tactile feedback | 3V operation |
| **Emergency Buttons** | Tactile Push Buttons (3x) | SOS activation | Normally open |
| **Battery** | Li-ion 3.7V 2000mAh | Power supply | Rechargeable with protection circuit |
| **Enclosure** | Waterproof Case | Device protection | IP65 rating recommended |

### Software Dependencies
| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 16.0.0+ | Backend server runtime |
| **Express.js** | 4.18.0+ | Web server framework |
| **Socket.io** | 4.7.0+ | Real-time communication |
| **Arduino IDE** | 1.8.0+ | ESP32 firmware development |
| **ESP32 Core** | 2.0.0+ | Arduino framework for ESP32 |
| **MPU6050 Library** | Latest | Sensor data processing |
| **TinyGPS++** | Latest | GPS data parsing |
| **ArduinoJson** | 6.0+ | JSON data handling |

### Cloud Services & APIs
| Service | Purpose | Provider |
|---------|---------|----------|
| **SMS Service** | Emergency notifications | Twilio |
| **Email Service** | Alert notifications | SendGrid/Nodemailer |
| **Geocoding** | Address resolution | Nominatim/Google Maps |
| **Weather API** | Environmental conditions | OpenWeatherMap |
| **Database** | Data storage | MongoDB/PostgreSQL |

## 📁 Overall Project Structure

```
📦 Fall Detection System - SmartVision Enhanced Platform
├── 📂 esp32/                          # ESP32 Firmware & Hardware Code
│   ├── enhanced-smartvision.ino       # Main firmware with fall detection
│   ├── smartvision_full_sim.ino       # Simulation version
│   ├── steps_and_fall_test.ino        # Fall detection testing
│   ├── config.h                       # Hardware configuration
│   └── README.md                       # ESP32 setup instructions
├── 📂 server/                          # Backend Server
│   ├── enhanced-server.js             # Main server with fall detection APIs
│   ├── server.js                      # Basic server (backup)
│   └── logs/                           # Server logs
│       ├── combined.log                # All server activities
│       └── error.log                   # Error tracking
├── 📂 frontend/                        # Next.js Web Dashboard
│   ├── src/
│   │   ├── app/                        # Next.js app router
│   │   ├── components/                 # React components
│   │   │   ├── DashboardOverview.tsx   # Main dashboard
│   │   │   ├── EmergencyAlerts.tsx     # Fall alert management
│   │   │   ├── DeviceManagement.tsx    # Device monitoring
│   │   │   └── SafetyZones.tsx         # Safety zone configuration
│   │   ├── context/                    # React context providers
│   │   ├── lib/                        # Utility functions and API calls
│   │   └── types/                      # TypeScript type definitions
│   ├── package.json                    # Frontend dependencies
│   └── README.md                       # Frontend setup guide
├── 📂 public/                          # Static Web Assets
│   └── index.html                      # Basic dashboard interface
├── 📂 docs/                           # Documentation
│   ├── API.md                         # Complete API documentation
│   ├── DEPLOYMENT.md                  # Production deployment guide
│   └── PRODUCT_ANALYSIS.md            # Product improvement analysis
├── 📂 tests/                          # Testing Suite
│   ├── api.test.js                    # API functionality tests
│   ├── test-api.js                    # External API integration tests
│   ├── test-core-api.js               # Core functionality tests
│   └── test-boundary-violation.js     # Safety zone testing
├── 📂 data/                           # Configuration & Data
│   ├── safety-zones.json             # Predefined safety zones
│   └── device-zone-status.json       # Device status tracking
├── 📂 logs/                           # System Logs
│   ├── combined.log                   # All system activities
│   ├── error.log                      # Error tracking
│   └── README.md                      # Logging configuration
├── 📂 dipex-gps-main/                # GPS Tracking Module
│   ├── server/server.js              # GPS-specific server
│   ├── public/index.html              # GPS tracking interface
│   └── package.json                   # GPS module dependencies
├── package.json                       # Main project dependencies
├── vercel.json                        # Deployment configuration
├── start.bat                          # Windows startup script
├── start.sh                           # Linux/macOS startup script
└── README.md                          # This documentation
```

### 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 Device  │    │  Backend Server │    │  Web Dashboard  │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Fall Detection│ │◄──►│ │Fall Algorithm│ │◄──►│ │Alert Display│ │
│ │  (MPU6050)  │ │    │ │  Processing │ │    │ │  & Control  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │GPS Tracking │ │◄──►│ │Emergency API│ │◄──►│ │Location Map │ │
│ │  (NEO-6M)   │ │    │ │  & Alerts   │ │    │ │   & History │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │SOS Buttons  │ │◄──►│ │SMS/Email API│ │◄──►│ │Device Status│ │
│ │& Vibration  │ │    │ │  (Twilio)   │ │    │ │  Monitor    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        v                        v                        v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Mobile App     │    │  Cloud Services │    │  Caregivers &   │
│  (Future)       │    │                 │    │  Emergency      │
│                 │    │ • SMS Alerts    │    │  Contacts       │
│ • Push Alerts   │    │ • Email Alerts  │    │                 │
│ • Location View │    │ • Geocoding     │    │ • Instant SMS   │
│ • Device Control│    │ • Weather Data  │    │ • Email Alerts  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```
├── 📂 logs/
│   └── README.md            # Logging configuration
├── package.json             # Enhanced dependencies
├── .env.example            # Environment configuration template
├── test-core-api.js        # Core API testing script
├── start.bat               # Windows startup script
└── start.sh                # Linux/macOS startup script
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Security
API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000

# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
EMERGENCY_CONTACT_NUMBERS=+1234567890,+0987654321

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### ESP32 Configuration
```cpp
// Device Configuration
const String DEVICE_ID = "ESP32_SmartVision_001";
const String FIRMWARE_VERSION = "2.0.0";

// WiFi Networks (with fallback)
WiFiCredentials wifiNetworks[] = {
  {"Primary_Network", "password1"},
  {"Backup_Network", "password2"},
  {"Mobile_Hotspot", "password3"}
};

// Server Endpoints
const char* baseServerUrl = "http://192.168.1.100:3000/api";
const char* backupServerUrl = "https://your-backup-server.com/api";
```

## 📊 API Endpoints

### Fall Detection APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fall-detection` | Report fall detection event |
| POST | `/api/fall-alert` | Trigger fall emergency alert |
| GET | `/api/fall-history` | Get fall incident history |
| POST | `/api/cancel-fall-alert` | Cancel false positive fall alert |
| GET | `/api/fall-analytics` | Get fall detection analytics |

### Core Device APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| POST | `/api/update-location` | Update device location |
| POST | `/api/update-steps` | Update step count and activity |
| GET | `/api/latest-location` | Get latest location |
| GET | `/api/latest-steps` | Get latest activity data |
| POST | `/api/emergency-alert` | Manual emergency alert |

### Safety Zone APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/safety-zones` | Get configured safety zones |
| POST | `/api/safety-zones` | Create new safety zone |
| PUT | `/api/safety-zones/:id` | Update safety zone |
| DELETE | `/api/safety-zones/:id` | Delete safety zone |
| GET | `/api/zone-violations` | Get zone violation history |

### Caregiver Management APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all monitored devices |
| GET | `/api/device/:id/status` | Get device health status |
| GET | `/api/device/:id/analytics` | Get device usage analytics |
| POST | `/api/emergency-contacts` | Manage emergency contacts |
| GET | `/api/alerts/history` | Get alert history |

## 🧪 Testing

### Run Test Suite
```bash
# Core functionality tests
npm test

# API integration tests  
npm run test:api

# Performance tests
npm run test:performance
```

### Manual Testing
```bash
# Test core APIs (no internet required)
node test-core-api.js

# Test all APIs (requires internet)
node test-api.js

# Test specific endpoint
curl -X GET http://localhost:3000/api/health
```

## 🚨 Fall Detection & Emergency System

### Fall Detection Algorithm
1. **Continuous Monitoring** - MPU6050 samples acceleration and gyroscope data at 100Hz
2. **Impact Detection** - Monitors for sudden acceleration changes exceeding threshold (>2.5g)
3. **Orientation Analysis** - Detects significant orientation changes indicating a fall
4. **Activity Classification** - Machine learning algorithm distinguishes falls from normal activities
5. **Confirmation Period** - 5-second confirmation window to reduce false positives
6. **Alert Generation** - Automatic emergency alert if fall is confirmed

### Fall Alert Process
1. **Fall Detected** - System detects potential fall event
2. **Device Vibration** - 3-second vibration alert to user
3. **Countdown Timer** - 30-second countdown for user to cancel false alarm
4. **Manual Cancel** - User can press any button to cancel false positive
5. **Emergency Activation** - If not cancelled, emergency protocol activates
6. **Multi-Channel Alerts** - SMS, email, and app notifications sent simultaneously

### Emergency Features
- **Automatic location sharing** in all emergency communications
- **Multiple SMS attempts** for reliability (3 attempts with 30-second intervals)
- **Escalation protocol** - If primary contacts don't respond, secondary contacts alerted
- **Fall incident logging** for medical analysis and system improvement
- **Emergency contact management** via web dashboard and API
- **Location history** tracking for emergency responders
- **Device health monitoring** to ensure system reliability

### Alert Customization
- **Sensitivity Settings** - Adjustable fall detection sensitivity for different user needs
- **Contact Hierarchy** - Primary and secondary emergency contacts
- **Alert Delays** - Configurable countdown timers
- **Quiet Hours** - Reduced sensitivity during sleep hours
- **Activity Profiles** - Different settings for different activity levels

## 📱 Mobile App (Planned)

### Family Member Features
- Real-time location tracking on map
- Push notifications for emergency alerts
- Historical route and activity data
- Device health monitoring
- Emergency contact management

### Device User Features
- Voice-guided navigation instructions
- Customizable alert preferences
- Offline mode with local caching
- Device status monitoring
- Route history and analytics

## 🔐 Security Features

### Backend Security
- **Device Authentication** with unique device IDs
- **Rate Limiting** to prevent API abuse
- **Input Validation** for all endpoints
- **Security Headers** via Helmet middleware
- **CORS Configuration** for controlled access
- **Request Logging** for audit trails

### Data Protection
- **Coordinate Validation** prevents invalid GPS data
- **Error Handling** without data leakage
- **Environment Variables** for sensitive configuration
- **HTTPS Support** for production deployment

## 📈 Performance & Monitoring

### Metrics Tracked
- **Device Health**: Battery, connectivity, sensor status
- **API Performance**: Response times, error rates
- **Usage Analytics**: Location updates, step counts
- **Emergency Response**: Alert success rates

### Monitoring Tools
- **Winston Logging** with structured JSON logs
- **Health Check Endpoints** for uptime monitoring
- **Performance Metrics** tracking
- **Error Reporting** with stack traces

## 🚀 Deployment

### Development
```bash
npm run dev          # Start with nodemon
npm test            # Run test suite
npm run logs        # View logs
```

### Production
```bash
# Docker deployment
docker-compose up -d

# PM2 process management
pm2 start ecosystem.config.js

# Vercel serverless
vercel --prod
```

See `docs/DEPLOYMENT.md` for detailed production setup.

## 🛠️ Hardware Setup & Wiring

### Fall Detection Sensor Configuration

#### MPU6050 (Primary Fall Detection Sensor)
```
ESP32 Pin Connections for MPU6050:
├── VCC → 3.3V
├── GND → GND  
├── SDA → GPIO 21
├── SCL → GPIO 22
├── XDA → Not Connected
├── XCL → Not Connected
├── AD0 → GND (for 0x68 I2C address)
└── INT → GPIO 19 (interrupt pin)
```

#### Complete Wiring Diagram
```
ESP32 Pin Connections:
├── GPIO 21/22: MPU6050 (SDA/SCL) - Fall Detection
├── GPIO 4/2:   GPS Module (RX/TX) - Location Tracking
├── GPIO 34:    Water Sensor (Analog) - Hazard Detection
├── GPIO 32/33: VL53L0X LiDAR (SDA/SCL) - Obstacle Detection
├── GPIO 25/26: Vibration Motors - Alert Feedback
├── GPIO 18/17/13: Emergency Buttons - Manual SOS
├── GPIO 19:    MPU6050 Interrupt - Fall Detection Trigger
└── Power Rails: 3.3V, 5V, GND distribution
```

### Sensor Placement Guidelines

#### Optimal Device Placement for Fall Detection
1. **Chest/Torso Mount** - Most accurate for detecting forward/backward falls
2. **Hip/Belt Mount** - Good overall detection, comfortable for daily wear
3. **Wrist Mount** - Less accurate but most convenient for users
4. **Pendant Style** - Hanging around neck, good for elderly users

#### Mounting Considerations
- **Secure Attachment** - Device must stay in position during normal activities
- **Comfort** - Should not interfere with daily activities
- **Accessibility** - Emergency buttons should be easily reachable
- **Weather Protection** - IP65 rating recommended for outdoor use

## 📋 System Requirements

### Backend Server
- **Node.js**: 16.0.0 or higher
- **RAM**: 512MB minimum, 1GB recommended
- **Storage**: 1GB minimum for logs and cache
- **Network**: Stable internet connection

### ESP32 Device
- **Arduino IDE**: 1.8.0 or higher
- **ESP32 Core**: 2.0.0 or higher
- **Libraries**: WiFi, HTTPClient, ArduinoJson, TinyGPS++
- **Flash Memory**: 4MB minimum

## 🤝 Contributing

### Development Workflow
1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes and test**: `npm test`
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Create Pull Request**

### Code Standards
- **ESLint** for JavaScript linting
- **Prettier** for code formatting
- **Jest** for testing
- **JSDoc** for documentation

## 📞 Support

### Documentation
- **API Reference**: `docs/API.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Product Analysis**: `docs/PRODUCT_ANALYSIS.md`

### Getting Help
- **Issues**: Create GitHub issue with detailed description
- **Features**: Submit feature request via GitHub
- **Emergency**: Contact emergency services directly (not this system)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ESP32 Community** for excellent hardware documentation
- **OpenStreetMap** for navigation services
- **Nominatim** for geocoding services
- **Twilio** for SMS messaging services
- **Accessibility Community** for valuable feedback and requirements

## 🔮 Roadmap

### Phase 1: Core Fall Detection (Current) ✅
- Advanced fall detection algorithm with MPU6050 integration
- Real-time emergency alert system via SMS and email
- Web-based caregiver dashboard for monitoring
- Multi-device support with health monitoring
- Comprehensive API documentation and testing suite

### Phase 2: Enhanced Intelligence (Next 4-6 weeks)
- Machine learning model training for improved fall detection accuracy
- Database integration for long-term health analytics
- Real-time WebSocket communication for instant alerts
- Mobile app development for caregivers and family members
- Advanced analytics dashboard with fall pattern analysis

### Phase 3: Smart Health Integration (2-4 months)
- Integration with health monitoring systems (heart rate, blood pressure)
- AI-powered health trend analysis and predictions
- Wearable device ecosystem integration (smartwatches, fitness trackers)
- Telemedicine platform integration for remote consultations
- Voice assistant integration for hands-free operation

### Phase 4: Community & Enterprise (6-12 months)
- Healthcare facility deployment (nursing homes, hospitals)
- Insurance company partnerships for elderly care programs
- Community safety networks and crowd-sourced assistance
- International market expansion with localized emergency services
- B2B enterprise solutions for assisted living facilities

---

## 🎯 Current Status

✅ **Fall Detection Core**: Advanced accelerometer-based fall detection with MPU6050  
✅ **Emergency Alerts**: Multi-channel alert system (SMS, email, dashboard)  
✅ **Real-time Monitoring**: Live device status and location tracking  
✅ **Caregiver Dashboard**: Web-based interface for family members and caregivers  
✅ **API Infrastructure**: Production-ready backend with comprehensive documentation  
✅ **Hardware Integration**: Complete ESP32 firmware with sensor fusion  
🔄 **ML Enhancement**: Machine learning model training for accuracy improvement  
📋 **Mobile App**: Native mobile application for iOS and Android  
📋 **Health Analytics**: Long-term health trend analysis and reporting  

**The fall detection system is now production-ready and actively protecting elderly users!**

---

*This fall detection system addresses the critical HTH-02 problem statement by providing immediate, reliable fall detection and emergency response for elderly care, potentially saving lives through rapid assistance deployment.*
