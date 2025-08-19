# SmartVision Family Safety Tracker API Documentation

## Overview
Enhanced IoT-based family safety tracking system with real-time monitoring for visually impaired individuals.

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication
All device requests should include the device ID in headers:
```
X-Device-ID: ESP32_SmartVision_001
```

## API Endpoints

### Health Check
```http
GET /api/health
```
Returns system health status and metrics.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 45678592,
    "heapTotal": 20971520,
    "heapUsed": 15728640
  },
  "devices": {
    "total": 5,
    "online": 3
  }
}
```

### Location Updates

#### Update Device Location
```http
POST /api/update-location
Content-Type: application/json
X-Device-ID: ESP32_SmartVision_001
```

**Request Body:**
```json
{
  "lat": 37.7749,
  "lng": -122.4194,
  "accuracy": 5.0,
  "timestamp": 1642234567890
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "lat": 37.7749,
    "lng": -122.4194,
    "accuracy": 5.0
  },
  "deviceId": "ESP32_SmartVision_001",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Get Latest Location
```http
GET /api/latest-location
X-Device-ID: ESP32_SmartVision_001
```

### Step Tracking

#### Update Step Count
```http
POST /api/update-steps
Content-Type: application/json
X-Device-ID: ESP32_SmartVision_001
```

**Request Body:**
```json
{
  "steps": 1250
}
```

#### Get Latest Steps
```http
GET /api/latest-steps
X-Device-ID: ESP32_SmartVision_001
```

### Navigation

#### Calculate Route
```http
POST /api/calculate-route
Content-Type: application/json
```

**Request Body:**
```json
{
  "start_lat": 37.7749,
  "start_lng": -122.4194,
  "end_lat": 37.7849,
  "end_lng": -122.4094,
  "mode": "foot"
}
```

**Response:**
```json
{
  "status": "success",
  "distance": 1250.5,
  "duration": 900.2,
  "steps": [
    {
      "instruction": "Head north on Market St",
      "distance": 200.5,
      "duration": 120.0,
      "location": [-122.4194, 37.7749],
      "bearing": 45
    }
  ],
  "geometry": "encoded_polyline_string",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Get Next Instruction
```http
GET /api/next-instruction
X-Device-ID: ESP32_SmartVision_001
```

### Geocoding

#### Search Location
```http
GET /api/geocode?query=San Francisco City Hall
```

**Response:**
```json
{
  "status": "success",
  "results": [
    {
      "lat": 37.7749,
      "lng": -122.4194,
      "name": "San Francisco City Hall, San Francisco, CA, USA",
      "type": "building",
      "importance": 0.9
    }
  ],
  "query": "San Francisco City Hall",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Emergency System

#### Emergency Alert
```http
POST /api/emergency-alert
Content-Type: application/json
X-Device-ID: ESP32_SmartVision_001
```

**Request Body:**
```json
{
  "type": "emergency",
  "message": "SOS button pressed - immediate assistance needed",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194,
    "accuracy": 5.0
  }
}
```

### Device Management

#### List All Devices
```http
GET /api/devices
```

#### Get Device Analytics
```http
GET /api/device/{deviceId}/analytics
```

**Response:**
```json
{
  "deviceId": "ESP32_SmartVision_001",
  "currentStatus": {
    "location": {
      "lat": 37.7749,
      "lng": -122.4194,
      "accuracy": 5.0
    },
    "steps": 1250,
    "isOnline": true,
    "lastUpdated": "2025-01-15T10:30:00.000Z"
  },
  "history": {
    "locations": [...],
    "steps": [...]
  },
  "statistics": {
    "totalLocationsRecorded": 500,
    "totalStepUpdates": 150,
    "averageStepsPerHour": 125.5
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_COORDINATES` | Latitude/longitude values are invalid |
| `MISSING_COORDINATES` | Required coordinates not provided |
| `DEVICE_NOT_FOUND` | Device ID not found in system |
| `NO_ROUTE_FOUND` | No navigation route available |
| `TIMEOUT` | External service timeout |
| `SERVICE_ERROR` | External service unavailable |
| `VALIDATION_ERROR` | Request validation failed |

## Rate Limits

- General API: 100 requests per 15 minutes per IP
- Device updates: 30 requests per minute per device
- Emergency alerts: No rate limit

## WebSocket Support (Future)

Real-time updates for family members:
```javascript
const ws = new WebSocket('wss://your-domain.com/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time location updates
};
```

## SDK Examples

### JavaScript/Node.js
```javascript
const SmartVisionAPI = require('./smartvision-sdk');

const api = new SmartVisionAPI({
  baseURL: 'http://localhost:3000/api',
  deviceId: 'ESP32_SmartVision_001'
});

// Update location
await api.updateLocation(37.7749, -122.4194, 5.0);

// Get navigation
const route = await api.calculateRoute(
  37.7749, -122.4194, // start
  37.7849, -122.4094  // end
);
```

### Python
```python
import smartvision

api = smartvision.SmartVisionAPI(
    base_url='http://localhost:3000/api',
    device_id='ESP32_SmartVision_001'
)

# Update location
api.update_location(37.7749, -122.4194, accuracy=5.0)

# Emergency alert
api.emergency_alert('SOS triggered', location=(37.7749, -122.4194))
```

## Testing

### Health Check
```bash
curl -X GET http://localhost:3000/api/health
```

### Update Location
```bash
curl -X POST http://localhost:3000/api/update-location \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: ESP32_SmartVision_001" \
  -d '{"lat": 37.7749, "lng": -122.4194, "accuracy": 5.0}'
```

### Calculate Route
```bash
curl -X POST http://localhost:3000/api/calculate-route \
  -H "Content-Type: application/json" \
  -d '{
    "start_lat": 37.7749,
    "start_lng": -122.4194,
    "end_lat": 37.7849,
    "end_lng": -122.4094
  }'
```
