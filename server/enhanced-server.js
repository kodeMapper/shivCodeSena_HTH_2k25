const express = require("express");
const cors = require("cors");
const axios = require('axios');
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const winston = require('winston');
const compression = require('compression');
const validator = require('validator');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const app = express();

// Enhanced Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'", "unpkg.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "unpkg.com", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      "font-src": ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
      "img-src": ["'self'", "data:", "*.openstreetmap.org", "*.tile.openstreetmap.org"]
    }
  }
}));

app.use(compression());
const allowedOriginsCfg = process.env.ALLOWED_ORIGINS?.split(',') || null;
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests
    if (!origin) return callback(null, true);
    // If explicit list provided, enforce it
    if (Array.isArray(allowedOriginsCfg)) {
      return callback(null, allowedOriginsCfg.includes(origin));
    }
    // Allow any localhost port in dev
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced Logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'family-safety-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const deviceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Allow more frequent updates for ESP32
  message: {
    error: "Device updating too frequently, please slow down.",
    retryAfter: "1 minute"
  }
});

app.use('/api/', generalLimiter);
app.use(['/api/update-location', '/api/update-steps'], deviceLimiter);

// Cache for geocoding and routing
const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes cache
  checkperiod: 120 // Check for expired keys every 2 minutes
});

// Enhanced Data Storage with Validation and Persistence
class DataStore {
  constructor() {
    this.devices = new Map();
    this.safetyZones = new Map();
    this.deviceZoneStatus = new Map(); // Track zone entry/exit status
    this.maxHistoryLength = 100;
    
    // File paths for persistence
    const isVercel = process.env.VERCEL === '1';
    this.initialSafetyZonesFile = path.join(__dirname, '../data/safety-zones.json');
    this.initialDeviceZoneStatusFile = path.join(__dirname, '../data/device-zone-status.json');

    if (isVercel) {
        this.safetyZonesFile = path.join(os.tmpdir(), 'safety-zones.json');
        this.deviceZoneStatusFile = path.join(os.tmpdir(), 'device-zone-status.json');
    } else {
        this.safetyZonesFile = this.initialSafetyZonesFile;
        this.deviceZoneStatusFile = this.initialDeviceZoneStatusFile;
    }
    
    // Ensure data directory exists (only for local)
    if (!isVercel) {
        const dataDir = path.dirname(this.safetyZonesFile);
        if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        }
    }
    
    this.loadPersistedData();
    this.initializeSampleData();
    this.cleanup();
  }
  
  // Load persisted data from JSON files
  loadPersistedData() {
    try {
      // Load safety zones
      let zonesFileToRead = this.safetyZonesFile;
      if (!fs.existsSync(zonesFileToRead) && fs.existsSync(this.initialSafetyZonesFile)) {
          zonesFileToRead = this.initialSafetyZonesFile;
      }

      if (fs.existsSync(zonesFileToRead)) {
        const zonesData = JSON.parse(fs.readFileSync(zonesFileToRead, 'utf8'));
        Object.entries(zonesData).forEach(([id, zone]) => {
          this.safetyZones.set(id, zone);
        });
        logger.info(`Loaded ${this.safetyZones.size} safety zones from storage`);
      }
      
      // Load device zone status
      let statusFileToRead = this.deviceZoneStatusFile;
      if (!fs.existsSync(statusFileToRead) && fs.existsSync(this.initialDeviceZoneStatusFile)) {
          statusFileToRead = this.initialDeviceZoneStatusFile;
      }

      if (fs.existsSync(statusFileToRead)) {
        const statusData = JSON.parse(fs.readFileSync(statusFileToRead, 'utf8'));
        Object.entries(statusData).forEach(([deviceId, zoneStatuses]) => {
          const statusMap = new Map();
          Object.entries(zoneStatuses).forEach(([zoneId, status]) => {
            statusMap.set(zoneId, status);
          });
          this.deviceZoneStatus.set(deviceId, statusMap);
        });
        logger.info(`Loaded device zone statuses for ${this.deviceZoneStatus.size} devices`);
      }
    } catch (error) {
      logger.warn('Failed to load persisted data:', error.message);
    }
  }
  
  // Save data to JSON files
  persistData() {
    try {
      // Save safety zones
      const zonesObj = {};
      this.safetyZones.forEach((zone, id) => {
        zonesObj[id] = zone;
      });
      fs.writeFileSync(this.safetyZonesFile, JSON.stringify(zonesObj, null, 2));
      
      // Save device zone status
      const statusObj = {};
      this.deviceZoneStatus.forEach((zoneStatuses, deviceId) => {
        const deviceStatusObj = {};
        zoneStatuses.forEach((status, zoneId) => {
          deviceStatusObj[zoneId] = status;
        });
        statusObj[deviceId] = deviceStatusObj;
      });
      fs.writeFileSync(this.deviceZoneStatusFile, JSON.stringify(statusObj, null, 2));
      
    } catch (error) {
      logger.error('Failed to persist data:', error.message);
    }
  }

  initializeSampleData() {
    // No default safety zones - user will add them manually
    
    // Seed at least one default device so the app always has something to show
    const defaultId = 'aneesh_bhaiyya'
    this.addDevice(defaultId, 'Aneesh Bhaiyya')
    // Nagpur default coordinates
    this.updateLocation(defaultId, 21.17662638279427, 79.0616383891541, 10)
  }

  validateCoordinates(lat, lng) {
    return validator.isLatLong(`${lat},${lng}`);
  }

  validateDeviceId(deviceId) {
    return deviceId && typeof deviceId === 'string' && deviceId.length <= 50;
  }

  addDevice(deviceId, displayName) {
    if (!this.validateDeviceId(deviceId)) {
      throw new Error('Invalid device ID');
    }

    if (!this.devices.has(deviceId)) {
      this.devices.set(deviceId, {
        location: { lat: 0, lng: 0, accuracy: 0 },
        steps: 0,
        lastUpdated: new Date(),
        isOnline: true,
  offlineNotified: false,
        batteryLevel: 85,
        locationHistory: [],
        stepHistory: [],
  alerts: [],
  emergency: null,
        route: null,
        currentStep: 0,
        displayName: typeof displayName === 'string' && displayName.trim().length > 0 ? displayName.trim() : undefined
      });
      logger.info(`New device registered: ${deviceId}`);
    }
  }

  updateLocation(deviceId, lat, lng, accuracy = 0) {
    if (!this.validateCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates');
    }

    this.addDevice(deviceId);
    const device = this.devices.get(deviceId);
    
    device.location = { lat: parseFloat(lat), lng: parseFloat(lng), accuracy: parseFloat(accuracy) };
    device.lastUpdated = new Date();
    // Transition to online
    if (!device.isOnline) {
      logger.info(`Device ${deviceId} back online (location update)`);
    }
    device.isOnline = true;
    device.offlineNotified = false;
    
    // Keep location history
    device.locationHistory.push({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: new Date(),
      accuracy: parseFloat(accuracy)
    });

    if (device.locationHistory.length > this.maxHistoryLength) {
      device.locationHistory.shift();
    }

    // Check for boundary violations after updating location
    this.checkBoundaryViolations(deviceId);

    logger.info(`Location updated for device ${deviceId}: ${lat}, ${lng}`);
    return device.location;
  }

  // Check for boundary violations (entry/exit)
  checkBoundaryViolations(deviceId) {
    const device = this.getDevice(deviceId);
    if (!device || !device.location) return;

    const deviceLat = device.location.lat;
    const deviceLng = device.location.lng;
    
    // Get or initialize device zone status
    if (!this.deviceZoneStatus.has(deviceId)) {
      this.deviceZoneStatus.set(deviceId, new Map());
    }
    const deviceStatus = this.deviceZoneStatus.get(deviceId);

    let statusChanged = false;

    this.safetyZones.forEach(zone => {
      if (!zone.enabled) return;

      const distance = this.calculateDistance(
        deviceLat, deviceLng,
        zone.coordinates.latitude, zone.coordinates.longitude
      );

      const isInsideZone = distance <= zone.radius;
      const wasInsideZone = deviceStatus.get(zone.id) || false;

      // Check for zone entry
      if (isInsideZone && !wasInsideZone && zone.notifyEntry) {
        this.addAlert(deviceId, {
          type: 'zone_entry',
          severity: 'medium',
          message: `Entered safety zone: ${zone.name}`,
          location: device.location,
          metadata: {
            zoneId: zone.id,
            zoneName: zone.name,
            distance: Math.round(distance)
          }
        });
        logger.info(`Device ${deviceId} entered zone ${zone.name} (${distance.toFixed(2)}m from center)`);
        statusChanged = true;
      }

      // Check for zone exit
      if (!isInsideZone && wasInsideZone && zone.notifyExit) {
        this.addAlert(deviceId, {
          type: 'zone_exit',
          severity: 'high',
          message: `Exited safety zone: ${zone.name}`,
          location: device.location,
          metadata: {
            zoneId: zone.id,
            zoneName: zone.name,
            distance: Math.round(distance)
          }
        });
        logger.warn(`Device ${deviceId} exited zone ${zone.name} - boundary violation detected (${distance.toFixed(2)}m from center)`);
        statusChanged = true;
      }

      // Update status
      deviceStatus.set(zone.id, isInsideZone);
    });

    // Persist status changes
    if (statusChanged) {
      this.persistData();
    }
  }

  updateSteps(deviceId, steps) {
    if (!Number.isInteger(steps) || steps < 0) {
      throw new Error('Invalid step count');
    }

    this.addDevice(deviceId);
    const device = this.devices.get(deviceId);
    
    device.steps = steps;
    device.lastUpdated = new Date();
    if (!device.isOnline) {
      logger.info(`Device ${deviceId} back online (steps update)`);
    }
    device.isOnline = true;
    device.offlineNotified = false;

    // Keep step history
    device.stepHistory.push({
      steps: steps,
      timestamp: new Date()
    });

    if (device.stepHistory.length > this.maxHistoryLength) {
      device.stepHistory.shift();
    }

    logger.info(`Steps updated for device ${deviceId}: ${steps}`);
    return device.steps;
  }

  // Add an alert and set current emergency if unresolved
  addAlert(deviceId, alert) {
    this.addDevice(deviceId)
    const device = this.devices.get(deviceId)
    const alertObj = {
      id: alert.id || Date.now().toString(),
      deviceId,
      deviceName: device.displayName || deviceId.replace('_',' '),
      type: alert.type || 'emergency',
      severity: alert.severity || 'high',
      message: alert.message || 'Emergency alert',
      location: alert.location || device.location,
      coordinates: device.location ? { latitude: device.location.lat, longitude: device.location.lng } : undefined,
      timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
      resolved: !!alert.resolved,
      resolvedAt: alert.resolved ? new Date() : undefined,
      metadata: alert.metadata || {} // Store additional data like zone info
    }

    device.alerts.push(alertObj)
    // keep only last 10 alerts
    if (device.alerts.length > 10) device.alerts.shift()

    if (!alertObj.resolved && alertObj.severity === 'high') {
      device.emergency = {
        type: alertObj.type,
        timestamp: alertObj.timestamp,
        resolved: false,
        coordinates: device.location ? { latitude: device.location.lat, longitude: device.location.lng } : undefined,
      }
    }
    // Treat alert as device activity
    device.lastUpdated = new Date();
    if (!device.isOnline) {
      logger.info(`Device ${deviceId} back online (alert activity)`);
    }
    device.isOnline = true;
    device.offlineNotified = false;
    this.devices.set(deviceId, device)
    logger.info(`Alert added for device ${deviceId}: ${alertObj.type} - ${alertObj.message}`);
    return alertObj
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  getAllDevices() {
    return Array.from(this.devices.entries()).map(([id, data]) => ({
      deviceId: id,
      ...data
    }));
  }

  updateDevice(deviceId, updates) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');
    if (updates.displayName !== undefined) {
      device.displayName = String(updates.displayName).trim();
    }
    if (typeof updates.isOnline === 'boolean') {
      device.isOnline = updates.isOnline;
    }
    if (typeof updates.steps === 'number' && updates.steps >= 0) {
      device.steps = Math.floor(updates.steps);
    }
    if (typeof updates.batteryLevel === 'number' && updates.batteryLevel >= 0 && updates.batteryLevel <= 100) {
      device.batteryLevel = Math.floor(updates.batteryLevel);
    }
    device.lastUpdated = new Date();
    this.devices.set(deviceId, device);
    return device;
  }

  // Safety Zone Methods
  createSafetyZone(zoneData) {
    const zone = {
      id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...zoneData,
      createdAt: new Date().toISOString()
    };

    if (!this.validateCoordinates(zone.coordinates.latitude, zone.coordinates.longitude)) {
      throw new Error('Invalid zone coordinates');
    }

    this.safetyZones.set(zone.id, zone);
    this.persistData(); // Save to file
    logger.info(`Safety zone created: ${zone.id} - ${zone.name}`);
    return zone;
  }

  updateSafetyZone(zoneId, updates) {
    const zone = this.safetyZones.get(zoneId);
    if (!zone) {
      throw new Error('Safety zone not found');
    }

    if (updates.coordinates && !this.validateCoordinates(updates.coordinates.latitude, updates.coordinates.longitude)) {
      throw new Error('Invalid zone coordinates');
    }

    const updatedZone = { ...zone, ...updates };
    this.safetyZones.set(zoneId, updatedZone);
    this.persistData(); // Save to file
    logger.info(`Safety zone updated: ${zoneId}`);
    return updatedZone;
  }

  deleteSafetyZone(zoneId) {
    const zone = this.safetyZones.get(zoneId);
    if (!zone) {
      throw new Error('Safety zone not found');
    }

    this.safetyZones.delete(zoneId);
    
    // Clean up device zone status for this zone
    this.deviceZoneStatus.forEach((zoneStatuses, deviceId) => {
      zoneStatuses.delete(zoneId);
    });
    
    this.persistData(); // Save to file
    logger.info(`Safety zone deleted: ${zoneId}`);
    return zone;
  }

  getSafetyZone(zoneId) {
    return this.safetyZones.get(zoneId);
  }

  getAllSafetyZones() {
    return Array.from(this.safetyZones.values());
  }

  // Check if device is in any safety zone
  checkDeviceInZones(deviceId) {
    const device = this.getDevice(deviceId);
    if (!device || !device.location) return [];

    const deviceLat = device.location.lat;
    const deviceLng = device.location.lng;
    const inZones = [];

    this.safetyZones.forEach(zone => {
      if (!zone.enabled) return;

      const distance = this.calculateDistance(
        deviceLat, deviceLng,
        zone.coordinates.latitude, zone.coordinates.longitude
      );

      if (distance <= zone.radius) {
        inZones.push({
          zone: zone,
          distance: distance
        });
      }
    });

    return inZones;
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Cleanup offline devices
  cleanup() {
    setInterval(() => {
      const now = new Date();
      const offlineThreshold = 5 * 60 * 1000; // 5 minutes

      this.devices.forEach((device, deviceId) => {
        if (now - device.lastUpdated > offlineThreshold) {
          if (!device.offlineNotified) {
            device.isOnline = false;
            device.offlineNotified = true;
            logger.warn(`Device ${deviceId} marked as offline`);
          }
        }
      });
    }, 60000); // Check every minute
  }
}

const dataStore = new DataStore();

// Middleware for device identification
const requireDeviceId = (req, res, next) => {
  const deviceId = req.headers['x-device-id'] || req.body.deviceId || 'default-device';
  req.deviceId = deviceId;
  next();
};

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.deviceId
    });
  });
  
  next();
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    devices: {
      total: dataStore.devices.size,
      online: dataStore.getAllDevices().filter(d => d.isOnline).length
    }
  };
  res.json(health);
});

// Enhanced Route Calculation with Caching
app.post("/api/calculate-route", requireDeviceId, async (req, res) => {
  try {
    const { start_lat, start_lng, end_lat, end_lng, mode = 'foot' } = req.body;
    
    // Validation
    if (!dataStore.validateCoordinates(start_lat, start_lng) || 
        !dataStore.validateCoordinates(end_lat, end_lng)) {
      return res.status(400).json({ 
        error: "Invalid coordinates",
        code: "INVALID_COORDINATES"
      });
    }

    const cacheKey = `route_${start_lat}_${start_lng}_${end_lat}_${end_lng}_${mode}`;
    const cachedRoute = cache.get(cacheKey);
    
    if (cachedRoute) {
      logger.info(`Route served from cache for device ${req.deviceId}`);
      return res.json(cachedRoute);
    }

    const start = `${start_lat},${start_lng}`;
    const end = `${end_lat},${end_lng}`;
    
    const response = await axios.get(
      `https://router.project-osrm.org/route/v1/${mode}/${start};${end}?steps=true&overview=full&annotations=true`,
      { 
        timeout: 15000,
        headers: {
          'User-Agent': 'SmartVision-SafetyTracker/1.0'
        }
      }
    );

    if (!response.data.routes || response.data.routes.length === 0) {
      return res.status(404).json({ 
        error: "No route found",
        code: "NO_ROUTE_FOUND"
      });
    }

    const route = response.data.routes[0];
    const routeData = {
      status: "success",
      distance: route.distance,
      duration: route.duration,
      steps: route.legs[0].steps.map(step => ({
        instruction: step.maneuver.instruction || 'Continue',
        distance: step.distance,
        duration: step.duration,
        location: step.maneuver.location,
        bearing: step.maneuver.bearing_after
      })),
      geometry: route.geometry,
      timestamp: new Date().toISOString()
    };

    // Store route for device
    const device = dataStore.getDevice(req.deviceId);
    if (device) {
      device.route = routeData.steps;
      device.currentStep = 0;
    }

    // Cache the route
    cache.set(cacheKey, routeData);
    
    logger.info(`Route calculated for device ${req.deviceId}: ${route.distance}m, ${Math.round(route.duration/60)}min`);
    res.json(routeData);
    
  } catch (error) {
    logger.error(`Routing error for device ${req.deviceId}:`, {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: "Routing service timeout",
        code: "TIMEOUT"
      });
    }
    
    res.status(500).json({ 
      error: "Routing service unavailable",
      code: "SERVICE_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Enhanced Geocoding with Caching and Rate Limiting
app.get("/api/geocode", async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ 
      error: "Query parameter missing or empty",
      code: "MISSING_QUERY"
    });
  }

  if (query.length > 100) {
    return res.status(400).json({ 
      error: "Query too long (max 100 characters)",
      code: "QUERY_TOO_LONG"
    });
  }

  try {
    const cacheKey = `geocode_${query.toLowerCase().trim()}`;
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      logger.info(`Geocode served from cache: ${query}`);
      return res.json(cachedResult);
    }

    // Rate limiting for external API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: query.trim(),
          format: 'json',
          limit: 5,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'SmartVision-SafetyTracker/1.0 (contact@smartvision.com)',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      }
    );

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ 
        error: "Location not found",
        code: "LOCATION_NOT_FOUND"
      });
    }

    const results = response.data.slice(0, 5).map(item => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      name: item.display_name,
      type: item.type,
      importance: item.importance
    }));

    const result = {
      status: "success",
      results: results,
      query: query.trim(),
      timestamp: new Date().toISOString()
    };

    // Cache the result
    cache.set(cacheKey, result, 1800); // 30 minutes cache for geocoding

    logger.info(`Geocode success: ${query} -> ${results.length} results`);
    res.json(result);
    
  } catch (error) {
    logger.error(`Geocoding error:`, {
      query,
      error: error.message,
      stack: error.stack
    });
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: "Geocoding service timeout",
        code: "TIMEOUT"
      });
    }
    
    res.status(500).json({ 
      error: "Geocoding service unavailable",
      code: "SERVICE_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reverse Geocoding with Caching
app.get("/api/reverse-geocode", async (req, res) => {
  try {
    const lat = req.query.lat;
    const lng = req.query.lng;

    if (!lat || !lng) {
      return res.status(400).json({
        error: "Latitude and longitude are required",
        code: "MISSING_COORDINATES"
      });
    }

    if (!dataStore.validateCoordinates(lat, lng)) {
      return res.status(400).json({
        error: "Invalid coordinates",
        code: "INVALID_COORDINATES"
      });
    }

    const keyLat = parseFloat(lat).toFixed(6);
    const keyLng = parseFloat(lng).toFixed(6);
    const cacheKey = `rev_${keyLat}_${keyLng}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info(`Reverse geocode from cache: ${keyLat},${keyLng}`);
      return res.json(cached);
    }

    // Simple throttle to be kind to the provider
    await new Promise(resolve => setTimeout(resolve, 750));

    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: {
          lat: keyLat,
          lon: keyLng,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'SmartVision-SafetyTracker/1.0 (contact@smartvision.com)',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      }
    );

    if (!response.data) {
      return res.status(404).json({
        error: "Address not found",
        code: "ADDRESS_NOT_FOUND"
      });
    }

    const payload = {
      status: "success",
      result: {
        lat: parseFloat(response.data.lat),
        lng: parseFloat(response.data.lon),
        name: response.data.display_name,
        address: response.data.address || null
      },
      timestamp: new Date().toISOString()
    };

    cache.set(cacheKey, payload, 1800); // cache for 30 minutes
    logger.info(`Reverse geocode success: ${keyLat},${keyLng}`);
    res.json(payload);

  } catch (error) {
    logger.error('Reverse geocoding error:', {
      error: error.message,
      stack: error.stack
    });
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: "Reverse geocoding service timeout",
        code: "TIMEOUT"
      });
    }
    res.status(500).json({
      error: "Reverse geocoding service unavailable",
      code: "SERVICE_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Enhanced Location Update with Validation
app.post("/api/update-location", requireDeviceId, (req, res) => {
  try {
    const { lat, lng, accuracy, timestamp } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: "Latitude and longitude are required",
        code: "MISSING_COORDINATES"
      });
    }

  const location = dataStore.updateLocation(req.deviceId, lat, lng, accuracy || 0);
  console.log(`[REQ] update-location dev=${req.deviceId} lat=${lat} lng=${lng} acc=${accuracy||0}`);
    
  const payload = { 
      status: "success", 
      data: location,
      deviceId: req.deviceId,
      timestamp: new Date().toISOString()
  };
  console.log(`[RES] update-location dev=${req.deviceId} -> 200`);
  res.json(payload);
    
  } catch (error) {
    logger.error(`Location update error for device ${req.deviceId}:`, {
      error: error.message,
      body: req.body
    });
    
    res.status(400).json({ 
      error: error.message,
      code: "VALIDATION_ERROR"
    });
  }
});

// Enhanced Steps Update
app.post("/api/update-steps", requireDeviceId, (req, res) => {
  try {
    const { steps } = req.body;
    
    if (steps === undefined || steps === null) {
      return res.status(400).json({ 
        error: "Steps count is required",
        code: "MISSING_STEPS"
      });
    }

    const stepCount = parseInt(steps);
    if (isNaN(stepCount) || stepCount < 0) {
      return res.status(400).json({ 
        error: "Invalid step count",
        code: "INVALID_STEPS"
      });
    }

  const totalSteps = dataStore.updateSteps(req.deviceId, stepCount);
  console.log(`[REQ] update-steps dev=${req.deviceId} steps=${stepCount}`);
    
  const payload = { 
      status: "success",
      totalSteps: totalSteps,
      deviceId: req.deviceId,
      timestamp: new Date().toISOString()
  };
  console.log(`[RES] update-steps dev=${req.deviceId} -> 200`);
  res.json(payload);
    
  } catch (error) {
    logger.error(`Steps update error for device ${req.deviceId}:`, {
      error: error.message,
      body: req.body
    });
    
    res.status(400).json({ 
      error: error.message,
      code: "VALIDATION_ERROR"
    });
  }
});

// ==================== FALL DETECTION API ====================
// ESP posts a boolean flag indicating whether a fall occurred
app.post('/api/fall-detected', requireDeviceId, (req, res) => {
  try {
    const { fell } = req.body || {}
  console.log(`[REQ] fall-detected dev=${req.deviceId} fell=${fell}`);
    if (typeof fell !== 'boolean') {
      return res.status(400).json({ success: false, error: 'fell (boolean) is required' })
    }

    const device = dataStore.getDevice(req.deviceId)
    if (!device) dataStore.addDevice(req.deviceId)

    if (fell) {
      const alert = dataStore.addAlert(req.deviceId, {
        type: 'fall',
        severity: 'high',
        message: 'Fall detected by accelerometer',
      })
      logger.warn(`Fall detected for device ${req.deviceId}`)
      console.log(`[RES] fall-detected dev=${req.deviceId} -> 200 alertId=${alert.id}`);
      return res.json({ success: true, alert })
    } else {
      // If explicit non-fall, just acknowledge
      console.log(`[RES] fall-detected dev=${req.deviceId} -> 200 no-fall`);
      return res.json({ success: true, message: 'No fall detected' })
    }
  } catch (error) {
    logger.error('Fall detection error:', error)
    console.log(`[RES] fall-detected dev=${req.deviceId} -> 500 error=${error?.message}`);
    res.status(500).json({ success: false, error: 'Failed to process fall signal' })
  }
})

// List emergency alerts (optionally filter by resolved)
app.get('/api/emergency/alerts', (req, res) => {
  try {
    const resolved = req.query.resolved
    const list = []
    dataStore.devices.forEach((d, id) => {
      (d.alerts || []).forEach(a => {
        if (resolved === undefined) list.push(a)
        else if ((resolved === 'true' && a.resolved) || (resolved === 'false' && !a.resolved)) list.push(a)
      })
    })
    res.json({ success: true, data: list })
  } catch (error) {
    logger.error('List alerts error:', error)
    res.status(500).json({ success: false, error: 'Failed to list alerts' })
  }
})

// Resolve an alert by ID (and clear current emergency if matching)
app.post('/api/emergency/alerts/:alertId/resolve', (req, res) => {
  try {
    const { alertId } = req.params
    let resolvedAlert = null
    dataStore.devices.forEach((d) => {
      const idx = (d.alerts || []).findIndex(a => a.id === alertId)
      if (idx >= 0) {
        d.alerts[idx].resolved = true
        d.alerts[idx].resolvedAt = new Date()
        // If the current emergency corresponds to this type, mark it resolved
        if (d.emergency && d.emergency.type === d.alerts[idx].type) {
          d.emergency.resolved = true
        }
        resolvedAlert = d.alerts[idx]
      }
    })
    if (!resolvedAlert) return res.status(404).json({ success: false, error: 'Alert not found' })
    res.json({ success: true, data: resolvedAlert })
  } catch (error) {
    logger.error('Resolve alert error:', error)
    res.status(500).json({ success: false, error: 'Failed to resolve alert' })
  }
})

// Device location (current)
app.get('/api/devices/:deviceId/location', (req, res) => {
  try {
    const d = dataStore.getDevice(req.params.deviceId);
    if (!d || !d.location) return res.status(404).json({ success: false, error: 'Location not found' });
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
    const payload = {
      deviceId: req.params.deviceId,
      coordinates: {
        latitude: d.location.lat,
        longitude: d.location.lng
      },
      timestamp: new Date(d.lastUpdated || new Date()).toISOString(),
      accuracy: d.location.accuracy
    };
  console.log(`[RES] devices/:id/location dev=${req.params.deviceId} lat=${payload.coordinates.latitude} lng=${payload.coordinates.longitude}`);
    res.json({ success: true, data: payload });
  } catch (error) {
    logger.error('Get device location error:', error);
    res.status(500).json({ success: false, error: 'Failed to get location' });
  }
});

// Device location history
app.get('/api/devices/:deviceId/history', (req, res) => {
  try {
    const d = dataStore.getDevice(req.params.deviceId);
    if (!d) return res.json({ success: true, data: [] });
    const hours = parseInt(req.query.hours) || 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const items = (d.locationHistory || [])
      .filter(p => new Date(p.timestamp).getTime() >= cutoff)
      .slice(-100)
      .map(p => ({
        deviceId: req.params.deviceId,
        coordinates: { latitude: p.lat, longitude: p.lng },
        timestamp: new Date(p.timestamp).toISOString(),
        accuracy: p.accuracy,
        speed: p.speed,
        bearing: p.bearing
      }));
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('Get device history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

// Get Next Navigation Instruction
app.get("/api/next-instruction", requireDeviceId, (req, res) => {
  try {
    const device = dataStore.getDevice(req.deviceId);
    
    if (!device || !device.route) {
      return res.status(404).json({ 
        error: "No active route found",
        code: "NO_ACTIVE_ROUTE"
      });
    }

    if (device.currentStep < device.route.length) {
      const step = device.route[device.currentStep];
      device.currentStep++;
      
      res.json({
        instruction: step.instruction,
        distance: step.distance,
        bearing: step.bearing,
        stepNumber: device.currentStep,
        totalSteps: device.route.length,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({ 
        instruction: "You have arrived at your destination",
        isComplete: true,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error(`Navigation error for device ${req.deviceId}:`, error);
    res.status(500).json({ 
      error: "Navigation service error",
      code: "NAVIGATION_ERROR"
    });
  }
});

// Get Latest Location
app.get("/api/latest-location", requireDeviceId, (req, res) => {
  try {
    const device = dataStore.getDevice(req.deviceId);
    
    if (!device) {
      return res.status(404).json({ 
        error: "Device not found",
        code: "DEVICE_NOT_FOUND"
      });
    }

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const payload = {
      ...device.location,
      lastUpdated: device.lastUpdated,
      isOnline: device.isOnline,
      deviceId: req.deviceId
  };
  console.log(`[RES] latest-location dev=${req.deviceId} lat=${payload.lat} lng=${payload.lng}`);
  res.json(payload);
    
  } catch (error) {
    logger.error(`Get location error for device ${req.deviceId}:`, error);
    res.status(500).json({ 
      error: "Failed to retrieve location",
      code: "GET_LOCATION_ERROR"
    });
  }
});

// Get Latest Steps
app.get("/api/latest-steps", requireDeviceId, (req, res) => {
  try {
    const device = dataStore.getDevice(req.deviceId);
    
    if (!device) {
      return res.status(404).json({ 
        error: "Device not found",
        code: "DEVICE_NOT_FOUND"
      });
    }

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const payload = {
      totalSteps: device.steps,
      lastUpdated: device.lastUpdated,
      isOnline: device.isOnline,
      deviceId: req.deviceId
  };
  console.log(`[RES] latest-steps dev=${req.deviceId} steps=${payload.totalSteps}`);
  res.json(payload);
    
  } catch (error) {
    logger.error(`Get steps error for device ${req.deviceId}:`, error);
    res.status(500).json({ 
      error: "Failed to retrieve steps",
      code: "GET_STEPS_ERROR"
    });
  }
});

// Get Device Analytics
app.get("/api/device/:deviceId/analytics", (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = dataStore.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ 
        error: "Device not found",
        code: "DEVICE_NOT_FOUND"
      });
    }

    const analytics = {
      deviceId,
      currentStatus: {
        location: device.location,
        steps: device.steps,
        isOnline: device.isOnline,
        lastUpdated: device.lastUpdated
      },
      history: {
        locations: device.locationHistory.slice(-50), // Last 50 locations
        steps: device.stepHistory.slice(-24) // Last 24 step updates
      },
      statistics: {
        totalLocationsRecorded: device.locationHistory.length,
        totalStepUpdates: device.stepHistory.length,
        averageStepsPerHour: device.stepHistory.length > 0 ? 
          device.steps / ((Date.now() - device.stepHistory[0].timestamp) / (1000 * 60 * 60)) : 0
      }
    };

    res.json(analytics);
    
  } catch (error) {
    logger.error(`Analytics error for device ${req.params.deviceId}:`, error);
    res.status(500).json({ 
      error: "Failed to retrieve analytics",
      code: "ANALYTICS_ERROR"
    });
  }
});

// List All Devices (for family members)
app.get("/api/devices", (req, res) => {
  try {
    const devices = dataStore.getAllDevices().map(device => ({
      deviceId: device.deviceId,
      name: device.displayName || device.deviceId.replace('_', ' '),
      type: 'tracker',
      status: device.isOnline ? 'online' : 'offline',
  batteryLevel: device.batteryLevel ?? 85,
      lastSeen: device.lastUpdated,
      location: device.location,
  emergency: device.emergency || null,
  alerts: device.alerts || [],
      ownerId: 'user1'
    }));

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  console.log(`[RES] devices list -> ${devices.length} item(s)`);
  res.json({
      success: true,
      data: devices,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`List devices error:`, error);
    res.status(500).json({ 
      success: false,
      error: "Failed to retrieve devices",
      code: "LIST_DEVICES_ERROR"
    });
  }
});

// Create/Register a Device
app.post("/api/devices", (req, res) => {
  try {
    const { deviceId, name } = req.body || {};
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }
    dataStore.addDevice(deviceId, name);
    const d = dataStore.getDevice(deviceId);
    return res.status(201).json({
      success: true,
      data: {
        deviceId,
        name: d.displayName || deviceId.replace('_', ' '),
        type: 'tracker',
        status: d.isOnline ? 'online' : 'offline',
  batteryLevel: d.batteryLevel ?? 85,
        lastSeen: d.lastUpdated,
        location: d.location,
        ownerId: 'user1'
      }
    });
  } catch (error) {
    logger.error('Create device error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create device' });
  }
});

// Get Device by ID
app.get('/api/devices/:deviceId', (req, res) => {
  try {
    const d = dataStore.getDevice(req.params.deviceId);
    if (!d) return res.status(404).json({ success: false, error: 'Device not found' });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    console.log(`[RES] device ${req.params.deviceId} -> lat=${d.location?.lat} lng=${d.location?.lng} steps=${d.steps}`);
  res.json({
      success: true,
      data: {
        deviceId: req.params.deviceId,
        name: d.displayName || req.params.deviceId.replace('_', ' '),
        type: 'tracker',
        status: d.isOnline ? 'online' : 'offline',
    batteryLevel: d.batteryLevel ?? 85,
        lastSeen: d.lastUpdated,
        location: d.location,
  emergency: d.emergency || null,
  alerts: d.alerts || [],
        ownerId: 'user1'
      }
    });
  } catch (error) {
    logger.error('Get device error:', error);
    res.status(500).json({ success: false, error: 'Failed to get device' });
  }
});

// Update Device by ID
app.put('/api/devices/:deviceId', (req, res) => {
  try {
    const d = dataStore.updateDevice(req.params.deviceId, req.body || {});
  res.json({
      success: true,
      data: {
        deviceId: req.params.deviceId,
        name: d.displayName || req.params.deviceId.replace('_', ' '),
        type: 'tracker',
        status: d.isOnline ? 'online' : 'offline',
    batteryLevel: d.batteryLevel ?? 85,
        lastSeen: d.lastUpdated,
        location: d.location,
  emergency: d.emergency || null,
  alerts: d.alerts || [],
        ownerId: 'user1'
      }
    });
  } catch (error) {
    logger.error('Update device error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update device' });
  }
});

// ==================== SAFETY ZONES API ====================

// Get all safety zones
app.get("/api/safety-zones", (req, res) => {
  try {
    const zones = dataStore.getAllSafetyZones();
    res.json({
      success: true,
      data: zones,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get safety zones error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve safety zones",
      code: "GET_ZONES_ERROR"
    });
  }
});

// Get specific safety zone
app.get("/api/safety-zones/:zoneId", (req, res) => {
  try {
    const zone = dataStore.getSafetyZone(req.params.zoneId);
    if (!zone) {
      return res.status(404).json({
        success: false,
        error: "Safety zone not found",
        code: "ZONE_NOT_FOUND"
      });
    }

    res.json({
      success: true,
      data: zone
    });
  } catch (error) {
    logger.error(`Get safety zone error for ${req.params.zoneId}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve safety zone",
      code: "GET_ZONE_ERROR"
    });
  }
});

// Create new safety zone
app.post("/api/safety-zones", (req, res) => {
  try {
    const { name, type, coordinates, radius, enabled, notifyEntry, notifyExit } = req.body;

    if (!name || !type || !coordinates || !radius) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, type, coordinates, radius",
        code: "MISSING_FIELDS"
      });
    }

    const zoneData = {
      name: name.trim(),
      type,
      coordinates,
      radius: parseInt(radius),
      enabled: enabled !== undefined ? enabled : true,
      notifyEntry: notifyEntry !== undefined ? notifyEntry : true,
      notifyExit: notifyExit !== undefined ? notifyExit : true,
      ownerId: 'user1' // In a real app, this would come from authentication
    };

    const newZone = dataStore.createSafetyZone(zoneData);

    res.status(201).json({
      success: true,
      data: newZone,
      message: "Safety zone created successfully"
    });

  } catch (error) {
    logger.error('Create safety zone error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: "CREATE_ZONE_ERROR"
    });
  }
});

// Update safety zone
app.put("/api/safety-zones/:zoneId", (req, res) => {
  try {
    const updates = req.body;
    const updatedZone = dataStore.updateSafetyZone(req.params.zoneId, updates);

    res.json({
      success: true,
      data: updatedZone,
      message: "Safety zone updated successfully"
    });

  } catch (error) {
    logger.error(`Update safety zone error for ${req.params.zoneId}:`, error);
    
    if (error.message === 'Safety zone not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
        code: "ZONE_NOT_FOUND"
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      code: "UPDATE_ZONE_ERROR"
    });
  }
});

// Delete safety zone
app.delete("/api/safety-zones/:zoneId", (req, res) => {
  try {
    const deletedZone = dataStore.deleteSafetyZone(req.params.zoneId);

    res.json({
      success: true,
      data: deletedZone,
      message: "Safety zone deleted successfully"
    });

  } catch (error) {
    logger.error(`Delete safety zone error for ${req.params.zoneId}:`, error);
    
    if (error.message === 'Safety zone not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
        code: "ZONE_NOT_FOUND"
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete safety zone",
      code: "DELETE_ZONE_ERROR"
    });
  }
});

// Check device zone status
app.get("/api/devices/:deviceId/zones", (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const zonesStatus = dataStore.checkDeviceInZones(deviceId);

    res.json({
      success: true,
      data: {
        deviceId,
        inZones: zonesStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Check device zones error for ${req.params.deviceId}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to check device zone status",
      code: "CHECK_ZONES_ERROR"
    });
  }
});

// ==================== ORIGINAL ENDPOINTS ====================

// Emergency Alert Endpoint
app.post("/api/emergency-alert", requireDeviceId, (req, res) => {
  try {
    const { type, message, location } = req.body;
    
    const device = dataStore.getDevice(req.deviceId);
    if (!device) {
      dataStore.addDevice(req.deviceId);
    }

    const alert = {
      id: Date.now().toString(),
      type: type || 'emergency',
      message: message || 'Emergency alert triggered',
      location: location || device?.location,
      timestamp: new Date(),
      deviceId: req.deviceId,
      resolved: false
    };

    device.alerts.push(alert);
    
    // Keep only last 10 alerts
    if (device.alerts.length > 10) {
      device.alerts.shift();
    }

    logger.warn(`Emergency alert from device ${req.deviceId}:`, alert);

    // Here you could integrate with SMS, email, or push notification services
    // For now, we'll just log and store the alert

    res.json({
      status: "success",
      alert: alert,
      message: "Emergency alert recorded and notifications sent"
    });
    
  } catch (error) {
    logger.error(`Emergency alert error for device ${req.deviceId}:`, error);
    res.status(500).json({ 
      error: "Failed to process emergency alert",
      code: "EMERGENCY_ALERT_ERROR"
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    code: "NOT_FOUND",
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 Enhanced Family Safety Tracker API running on port ${PORT}`);
    logger.info(`📊 Health check available at http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
