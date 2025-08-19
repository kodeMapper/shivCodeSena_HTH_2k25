import axios from 'axios'
import { Device, SafetyZone, GeofenceEvent, EmergencyAlert, LocationHistory, ApiResponse, DashboardStats } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth headers
api.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log errors if they're not network connection errors
    if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
      console.warn('API Warning:', error.message)
    }
    return Promise.reject(error)
  }
)

export const deviceApi = {
  // Get all devices
  getDevices: async (): Promise<Device[]> => {
    try {
      const response = await api.get('/devices')
      const raw = (response.data?.data || response.data) as any[]
      if (!Array.isArray(raw)) return []
      // Normalize to Device shape expected by frontend
      const list: Device[] = raw.map((d: any) => {
        const hasLatLng = d?.location && (d.location.latitude !== undefined || d.location.lat !== undefined)
        const latitude = hasLatLng ? (d.location.latitude ?? d.location.lat) : undefined
        const longitude = hasLatLng ? (d.location.longitude ?? d.location.lng) : undefined
        const ts = d.lastSeen || d.lastUpdated || new Date().toISOString()
        return {
          deviceId: d.deviceId || d.id || String(d.name || 'device'),
          name: d.name || (d.deviceId ? d.deviceId.replace('_', ' ') : 'Device'),
          status: (d.status === 'online' || d.status === 'offline' || d.status === 'emergency') ? d.status : (d.isOnline ? 'online' : 'offline'),
          batteryLevel: typeof d.batteryLevel === 'number' ? d.batteryLevel : undefined,
          lastSeen: typeof ts === 'string' ? ts : new Date(ts).toISOString(),
          location: (latitude !== undefined && longitude !== undefined) ? {
            latitude,
            longitude,
            timestamp: typeof ts === 'string' ? ts : new Date(ts).toISOString(),
            accuracy: d.location?.accuracy,
            speed: d.location?.speed,
            bearing: d.location?.heading ?? d.location?.bearing,
          } : undefined,
          emergency: d.emergency,
        } as Device
      })
      return list
    } catch (error) {
      // Return empty array for graceful fallback
      return []
    }
  },

  // Create/register a device
  createDevice: async (deviceId: string, name?: string): Promise<Device | null> => {
    try {
      const response = await api.post('/devices', { deviceId, name })
      const d: any = response.data?.data || response.data
      if (!d) return null
      // Normalize to Device
      const loc = d.location
      return {
        deviceId: d.deviceId,
        name: d.name || (d.deviceId?.replace('_', ' ') ?? 'Device'),
        status: d.status === 'online' || d.status === 'offline' || d.status === 'emergency' ? d.status : 'online',
        batteryLevel: typeof d.batteryLevel === 'number' ? d.batteryLevel : undefined,
        lastSeen: typeof d.lastSeen === 'string' ? d.lastSeen : new Date().toISOString(),
        location: loc && (loc.latitude !== undefined || loc.lat !== undefined)
          ? {
              latitude: loc.latitude ?? loc.lat,
              longitude: loc.longitude ?? loc.lng,
              timestamp: new Date().toISOString(),
              accuracy: loc.accuracy
            }
          : undefined
      }
    } catch {
      return null
    }
  },

  // Get specific device
  getDevice: async (deviceId: string): Promise<Device | null> => {
    try {
      const response = await api.get<ApiResponse<Device>>(`/devices/${deviceId}`)
      return response.data.data || null
    } catch (error) {
      return null
    }
  },

  // Update device
  updateDevice: async (deviceId: string, updates: Partial<Device>): Promise<Device> => {
    const response = await api.put<ApiResponse<Device>>(`/devices/${deviceId}`, updates)
    return response.data.data!
  },

  // Get device location
  getLocation: async (deviceId: string): Promise<LocationHistory | null> => {
    try {
      const response = await api.get<ApiResponse<LocationHistory>>(`/devices/${deviceId}/location`)
      return response.data.data || null
    } catch (error) {
      return null
    }
  },

  // Get location history
  getLocationHistory: async (deviceId: string, hours: number = 24): Promise<LocationHistory[]> => {
    try {
      const response = await api.get<ApiResponse<LocationHistory[]>>(`/devices/${deviceId}/history`, { params: { hours } })
      if (response.data?.data) return response.data.data
    } catch {}
    // Fallback to analytics endpoint from enhanced server
    try {
      const res = await api.get(`/device/${deviceId}/analytics`)
      const arr = (res.data?.history?.locations || []) as any[]
      const mapped: LocationHistory[] = arr.map((p: any) => ({
        deviceId,
        coordinates: {
          latitude: p.latitude ?? p.lat,
          longitude: p.longitude ?? p.lng,
        },
        timestamp: typeof p.timestamp === 'string' ? p.timestamp : new Date(p.timestamp).toISOString(),
        accuracy: p.accuracy,
        speed: p.speed,
        bearing: p.heading ?? p.bearing,
      }))
      return mapped
    } catch {
      return []
    }
  },
}

export const safetyZoneApi = {
  // Get all safety zones
  getZones: async (): Promise<SafetyZone[]> => {
    try {
      const response = await api.get<ApiResponse<SafetyZone[]>>('/safety-zones')
      return response.data.data || []
    } catch (error) {
      // Return empty array for graceful fallback
      return []
    }
  },

  // Create safety zone
  createZone: async (zone: Omit<SafetyZone, 'id'>): Promise<SafetyZone> => {
    const response = await api.post<ApiResponse<SafetyZone>>('/safety-zones', zone)
    return response.data.data!
  },

  // Update safety zone
  updateZone: async (zoneId: string, updates: Partial<SafetyZone>): Promise<SafetyZone> => {
    const response = await api.put<ApiResponse<SafetyZone>>(`/safety-zones/${zoneId}`, updates)
    return response.data.data!
  },

  // Delete safety zone
  deleteZone: async (zoneId: string): Promise<void> => {
    await api.delete(`/safety-zones/${zoneId}`)
  },
}

export const emergencyApi = {
  // Get emergency alerts
  getAlerts: async (resolved?: boolean): Promise<EmergencyAlert[]> => {
    const response = await api.get<ApiResponse<EmergencyAlert[]>>('/emergency/alerts', {
      params: resolved !== undefined ? { resolved } : {}
    })
    return response.data.data || []
  },

  // Resolve emergency alert
  resolveAlert: async (alertId: string): Promise<EmergencyAlert> => {
    const response = await api.post<ApiResponse<EmergencyAlert>>(`/emergency/alerts/${alertId}/resolve`)
    return response.data.data!
  },

  // Trigger emergency
  triggerEmergency: async (deviceId: string, type: string, coordinates?: { latitude: number; longitude: number }): Promise<void> => {
    await api.post('/emergency/trigger', { deviceId, type, coordinates })
  },
}

export const geofenceApi = {
  // Get geofence events
  getEvents: async (hours: number = 24): Promise<GeofenceEvent[]> => {
    const response = await api.get<ApiResponse<GeofenceEvent[]>>('/geofence/events', {
      params: { hours }
    })
    return response.data.data || []
  },
}

export const dashboardApi = {
  // Get dashboard statistics
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats')
    return response.data.data || {
      totalDevices: 0,
      onlineDevices: 0,
      emergencyAlerts: 0,
      batteryAlerts: 0,
      geofenceViolations: 0,
    }
  },
}

export default api

// Reverse geocoding API wrapper
// (moved enhanced helpers below)

// Lightweight helpers for reverse geocoding and steps
export const reverseGeocodeApi = {
  lookup: async (lat: number, lng: number): Promise<{ name: string; lat: number; lng: number } | null> => {
    try {
      const res = await api.get('/reverse-geocode', { params: { lat, lng } })
      const result = (res.data && (res.data.result || res.data.data))
      if (!result) return null
      return { name: result.name, lat: result.lat, lng: result.lng }
    } catch {
      return null
    }
  }
}

export const stepsApi = {
  updateSteps: async (deviceId: string, steps: number): Promise<number | null> => {
    try {
      const res = await api.post('/update-steps', { deviceId, steps })
      return res.data?.totalSteps ?? null
    } catch {
      return null
    }
  },
  getAnalytics: async (deviceId: string): Promise<any | null> => {
    try {
      const res = await api.get(`/device/${deviceId}/analytics`)
      return res.data
    } catch {
      return null
    }
  }
}
