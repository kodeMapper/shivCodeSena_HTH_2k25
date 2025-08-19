export interface Device {
  deviceId: string
  name: string
  location?: {
    latitude: number
    longitude: number
    timestamp: string
    accuracy?: number
    altitude?: number
    speed?: number
    bearing?: number
  }
  status: 'online' | 'offline' | 'emergency'
  batteryLevel?: number
  sensors?: {
    temperature?: number
    humidity?: number
    obstacle?: boolean
    motion?: boolean
    heartRate?: number
  }
  lastSeen: string
  emergency?: {
    type: 'manual' | 'fall' | 'obstacle' | 'heart_rate' | 'geofence'
    timestamp: string
    resolved: boolean
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
}

export interface SafetyZone {
  id: string
  name: string
  type: 'home' | 'school' | 'work' | 'custom'
  coordinates: {
    latitude: number
    longitude: number
  }
  radius: number
  enabled: boolean
  notifyEntry: boolean
  notifyExit: boolean
}

export interface GeofenceEvent {
  id: string
  deviceId: string
  zoneId: string
  zoneName: string
  type: 'entry' | 'exit'
  timestamp: string
  coordinates: {
    latitude: number
    longitude: number
  }
}

export interface EmergencyAlert {
  id: string
  deviceId: string
  deviceName: string
  type: 'manual' | 'fall' | 'obstacle' | 'heart_rate' | 'geofence' | 'zone_entry' | 'zone_exit'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
}

export interface LocationHistory {
  deviceId: string
  coordinates: {
    latitude: number
    longitude: number
  }
  timestamp: string
  accuracy?: number
  speed?: number
  bearing?: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DashboardStats {
  totalDevices: number
  onlineDevices: number
  emergencyAlerts: number
  batteryAlerts: number
  geofenceViolations: number
}
