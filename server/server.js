const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const app = express();
const axios = require('axios');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors());
app.options('*', cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Store latest data
let latestData = {
  location: { lat: 0, lng: 0 },
  steps: 0,
  lastUpdated: null
};

let latestLocation = { lat: 0, lng: 0 };
let destination = { lat: 0, lng: 0 };  // Separate from latestLocation

let currentRoute = [];
let currentStep = 0;

// In-memory storage for devices and safety zones
let devices = [
  {
    deviceId: 'ESP32_001',
    name: 'John\'s Tracker',
    type: 'tracker',
    status: 'online',
    batteryLevel: 85,
    lastSeen: new Date().toISOString(),
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      speed: 0,
      heading: 0,
      timestamp: new Date().toISOString()
    },
    ownerId: 'user1'
  },
  {
    deviceId: 'ESP32_002',
    name: 'Sarah\'s Tracker',
    type: 'tracker',
    status: 'offline',
    batteryLevel: 45,
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
      speed: 5.2,
      heading: 180,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    ownerId: 'user1'
  }
];

let safetyZones = [
  // No default zones - user will add them manually
];
    createdAt: new Date().toISOString()
  }
];


// Log all incoming requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    query: req.query,
    body: req.body,
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== DEVICE MANAGEMENT API ====================

// Get all devices
app.get('/api/devices', (req, res) => {
  res.json({
    success: true,
    data: devices,
    timestamp: new Date().toISOString()
  });
});

// Get specific device
app.get('/api/devices/:deviceId', (req, res) => {
  const device = devices.find(d => d.deviceId === req.params.deviceId);
  if (!device) {
    return res.status(404).json({
      success: false,
      error: 'Device not found'
    });
  }
  res.json({
    success: true,
    data: device
  });
});

// Update device
app.put('/api/devices/:deviceId', (req, res) => {
  const deviceIndex = devices.findIndex(d => d.deviceId === req.params.deviceId);
  if (deviceIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Device not found'
    });
  }
  
  devices[deviceIndex] = { ...devices[deviceIndex], ...req.body };
  res.json({
    success: true,
    data: devices[deviceIndex]
  });
});

// Get device location
app.get('/api/devices/:deviceId/location', (req, res) => {
  const device = devices.find(d => d.deviceId === req.params.deviceId);
  if (!device || !device.location) {
    return res.status(404).json({
      success: false,
      error: 'Location not found'
    });
  }
  res.json({
    success: true,
    data: device.location
  });
});

// Get device location history
app.get('/api/devices/:deviceId/history', (req, res) => {
  // For now, return current location as history
  const device = devices.find(d => d.deviceId === req.params.deviceId);
  if (!device || !device.location) {
    return res.json({
      success: true,
      data: []
    });
  }
  
  res.json({
    success: true,
    data: [device.location]
  });
});

// ==================== SAFETY ZONES API ====================

// Get all safety zones
app.get('/api/safety-zones', (req, res) => {
  res.json({
    success: true,
    data: safetyZones
  });
});

// Create safety zone
app.post('/api/safety-zones', (req, res) => {
  const newZone = {
    id: `zone_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  safetyZones.push(newZone);
  
  res.status(201).json({
    success: true,
    data: newZone
  });
});

// Update safety zone
app.put('/api/safety-zones/:zoneId', (req, res) => {
  const zoneIndex = safetyZones.findIndex(z => z.id === req.params.zoneId);
  if (zoneIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Safety zone not found'
    });
  }
  
  safetyZones[zoneIndex] = { ...safetyZones[zoneIndex], ...req.body };
  res.json({
    success: true,
    data: safetyZones[zoneIndex]
  });
});

// Delete safety zone
app.delete('/api/safety-zones/:zoneId', (req, res) => {
  const zoneIndex = safetyZones.findIndex(z => z.id === req.params.zoneId);
  if (zoneIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Safety zone not found'
    });
  }
  
  safetyZones.splice(zoneIndex, 1);
  res.json({
    success: true,
    message: 'Safety zone deleted'
  });
});

// ==================== ORIGINAL GPS TRACKING API ====================

app.post("/calculate-route", async (req, res) => {
  try {
    // Extract parameters from the request body
    const { start_lat, start_lng, end_lat, end_lng } = req.body;
    
    // Validate parameters
    if (!start_lat || !start_lng || !end_lat || !end_lng) {
      return res.status(400).json({ error: "Missing required coordinates" });
    }

    const start = `${start_lat},${start_lng}`;
    const end = `${end_lat},${end_lng}`;
    
    const response = await axios.get(
      `https://router.project-osrm.org/route/v1/foot/${start};${end}?steps=true&overview=full&annotations=true`,
      { timeout: 10000 }
    );

    if (!response.data.routes || response.data.routes.length === 0) {
      return res.status(404).json({ error: "No route found" });
    }

    const route = response.data.routes[0];
    currentRoute = route.legs[0].steps;
    currentStep = 0;
    
    // Store destination for future reference
    destination = { lat: end_lat, lng: end_lng };
    
    res.json({ 
      status: "success", 
      distance: route.distance,
      duration: route.duration,
      steps: currentRoute.map(step => ({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
        location: step.maneuver.location
      })),
      geometry: route.geometry // Optional: for map display
    });
  } catch (error) {
    console.error("Routing error:", error);
    res.status(500).json({ 
      error: "Routing failed",
      details: error.message 
    });
  }
});


app.get("/geocode", async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: "Query parameter missing" });
  }

  try {
    console.log(`Making request to Nominatim for: ${query}`);
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`,
      {
        headers: {
          'User-Agent': 'Dipex/1.0 (gadesarang02@gmail.com)',
          'Accept-Language': 'en-US,en;q=0.9' // Optional: specify language
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log(`Nominatim response status: ${response.status}`);
    
    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    const result = {
      lat: parseFloat(response.data[0].lat),
      lng: parseFloat(response.data[0].lon),
      name: response.data[0].display_name
    };

    console.log(`Geocode success for ${query}:`, result);
    res.json({ status: "success", ...result });
    
  } catch (error) {
    console.error("Geocoding error:", {
      query,
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    res.status(500).json({ 
      error: "Geocoding service unavailable",
      details: error.message 
    });
  }
});

app.get("/next-instruction", (req, res) => {
  if (currentStep < currentRoute.length) {
    const step = currentRoute[currentStep];
    res.json({
      instruction: step.maneuver.instruction,
      distance: step.distance 
    });
    currentStep++;
  } else {
    res.json({ instruction: "Arrived at destination" });
  }
});

app.post("/update-location", (req, res) => {
  console.log("Received:", req.body);
  latestLocation = req.body;
  res.json({ status: "success", data: latestLocation });
});

app.post("/update-steps", (req, res) => {
  const currentSteps = req.body.steps; // Absolute value
  console.log("Received steps:", currentSteps);
  
  // Store the latest step count (not cumulative)
  latestData.steps = currentSteps; 
  latestData.lastUpdated = new Date();

  res.json({ totalSteps: currentSteps });
});

app.get("/latest-location", (req, res) => {
  res.json(latestLocation);
});

app.get("/latest-steps", (req, res) => {
  res.json({ totalSteps: latestData.steps });  
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));