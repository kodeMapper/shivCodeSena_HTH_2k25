"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { 
  Settings,
  Satellite,
  Map as MapIcon,
  Navigation2,
  PlusCircle,
  X
} from 'lucide-react'
import { Device, SafetyZone } from '@/types'
import { useAddress, formatAddressShort } from '@/lib/useAddress'
import { deviceApi } from '@/lib/api'
import { useZones } from '@/context/ZonesContext'
import AddZoneModal from '@/components/AddZoneModal'

// Dynamically import map to avoid SSR issues
const DynamicMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
        />
        <p className="text-slate-600 dark:text-slate-400">Loading Map...</p>
      </div>
    </div>
  )
})

interface MapControlsProps {
  onChangeMapType: (type: 'satellite' | 'street' | 'dark') => void
  mapType: 'satellite' | 'street' | 'dark'
}

const MapControls = ({ 
  onChangeMapType,
  mapType 
}: MapControlsProps) => {
  const mapTypes = [
    { id: 'satellite' as const, label: 'Satellite', icon: Satellite },
    { id: 'street' as const, label: 'Street', icon: MapIcon },
    { id: 'dark' as const, label: 'Dark', icon: Navigation2 },
  ]

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      {/* Map type switching - Clean buttons with text labels */}
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-2 shadow-lg">
        <div className="flex items-center space-x-1">
          {mapTypes.map((type) => (
            <motion.button 
              key={type.id} 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={() => onChangeMapType(type.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                mapType === type.id 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <type.icon className="w-4 h-4" />
              <span>{type.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface DeviceInfoPanelProps {
  device: Device | null
  onClose: () => void
  mapRef: React.RefObject<any>
}

const DeviceInfoPanel = ({ device, onClose, mapRef }: DeviceInfoPanelProps) => {
  const lat = device?.location?.latitude
  const lng = device?.location?.longitude
  const { address } = useAddress(lat, lng)
  if (!device) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-4 min-w-80 max-w-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {device.name}
          </h3>
          <button
            onClick={() => {
              try {
                (mapRef.current as any)?.openPopupForDevice?.(device.deviceId)
              } catch {}
            }}
            className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            title="Locate"
          >
            Locate
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="space-y-2">
        {device.location && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Location:</span>
            <span className="text-slate-900 dark:text-white text-right ml-2">
              {formatAddressShort(address) || `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`}
            </span>
          </div>
        )}
        
        {device.batteryLevel !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Battery:</span>
            <span className={`font-medium ${
              device.batteryLevel > 20 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {device.batteryLevel}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Last Update:</span>
          <span className="text-slate-900 dark:text-white">
            {new Date(device.lastSeen).toLocaleTimeString()}
          </span>
        </div>

        {device.location?.speed !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Speed:</span>
            <span className="text-slate-900 dark:text-white">
              {Math.round(device.location.speed * 3.6)} km/h
            </span>
          </div>
        )}
      </div>

      {device.emergency && !device.emergency.resolved && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Emergency Alert Active
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {device.emergency.type} - {new Date(device.emergency.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default function MapView() {
  const [devices, setDevices] = useState<Device[]>([])
  const { zones: safetyZones, addZone } = useZones()
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [mapType, setMapType] = useState<'satellite' | 'street' | 'dark'>('street')
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [pickCenter, setPickCenter] = useState<{ active: boolean, coords: { latitude: number; longitude: number } | null }>({ active: false, coords: null })
  const [pendingRadius, setPendingRadius] = useState<number>(200)
  const [showAddModal, setShowAddModal] = useState(false)
  const mapRef = useRef<any>(null)
  const DEFAULT_RADIUS_M = 2000
  const DEFAULT_CENTER = { latitude: 21.17662638279427, longitude: 79.0616383891541 }

  // Utility: compute bounding box for a radius (meters) around center
  const getBoundsForRadius = (center: { latitude: number; longitude: number }, radiusM: number) => {
    const lat = center.latitude
    const lng = center.longitude
    const earthRadiusLat = 111320 // meters per degree latitude
    const latDelta = radiusM / earthRadiusLat
    const lngDelta = radiusM / (earthRadiusLat * Math.cos((lat * Math.PI) / 180))
    const southWest: [number, number] = [lat - latDelta, lng - lngDelta]
    const northEast: [number, number] = [lat + latDelta, lng + lngDelta]
    return [southWest, northEast]
  }

  useEffect(() => {
    // Set client flag to prevent hydration issues
    setIsClient(true)
    
    const fetchData = async () => {
      try {
        const [devicesData] = await Promise.allSettled([
          deviceApi.getDevices()
        ])

        if (devicesData.status === 'fulfilled') {
          setDevices(devicesData.value)
        } else {
          // Fallback mock devices with Nagpur coordinates
          setDevices([
            {
              deviceId: 'device1',
              name: 'Aneesh Bhaiyya',
              status: 'online',
              batteryLevel: 85,
              lastSeen: new Date().toISOString(),
              location: {
                latitude: 21.17662638279427,
                longitude: 79.0616383891541,
                timestamp: new Date().toISOString(),
                speed: 0,
                bearing: 0
              }
            },
            {
              deviceId: 'device2',
              name: 'Dad\'s Tracker',
              status: 'online',
              batteryLevel: 92,
              lastSeen: new Date().toISOString(),
              location: {
                latitude: 21.1766,
                longitude: 79.0616,
                timestamp: new Date().toISOString(),
                speed: 0,
                bearing: 0
              }
            },
            {
              deviceId: 'device3',
              name: 'Mom\'s Device',
              status: 'online',
              batteryLevel: 23,
              lastSeen: new Date().toISOString(),
              location: {
                latitude: 21.1760,
                longitude: 79.0620,
                timestamp: new Date().toISOString(),
                speed: 2.5,
                bearing: 90
              }
            }
          ])
        }

        // Auto-select the first device (Aneesh Bhaiyya) to show the blue dot
        if (devicesData.status === 'fulfilled' && devicesData.value.length > 0) {
          setSelectedDevice(devicesData.value[0])
        } else {
          // Auto-select mock first device
          setSelectedDevice({
            deviceId: 'device1',
            name: 'Aneesh Bhaiyya',
            status: 'online',
            batteryLevel: 85,
            lastSeen: new Date().toISOString(),
            location: {
              latitude: 21.17662638279427,
              longitude: 79.0616383891541,
              timestamp: new Date().toISOString(),
              speed: 0,
              bearing: 0
            }
          })
        }

  // zones are provided by context
      } catch (error) {
        console.error('Failed to fetch map data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const onChanged = () => fetchData()
    if (typeof window !== 'undefined') {
      window.addEventListener('devices-changed', onChanged)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devices-changed', onChanged)
      }
    }
  }, [])

  const handleChangeMapType = (type: 'satellite' | 'street' | 'dark') => {
    setMapType(type)
  }

  const handleResetView = () => {
    if (!mapRef.current) return
    const target = selectedDevice?.location
      || devices.find(d => d.location)?.location
      || DEFAULT_CENTER
    const bounds = getBoundsForRadius(
      { latitude: target.latitude, longitude: target.longitude },
      DEFAULT_RADIUS_M
    )
    mapRef.current.fitBounds(bounds, { padding: [50, 50] })
  }

  // Nudge Leaflet to recalc size after mount and animations
  useEffect(() => {
    if (!isClient || loading) return
    const invalidate = () => {
      try {
        const map = mapRef.current?.getMap?.()
        if (map) map.invalidateSize(false)
      } catch {}
    }
    invalidate()
    const t1 = setTimeout(invalidate, 150)
    const t2 = setTimeout(invalidate, 500)
    window.addEventListener('resize', invalidate)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', invalidate)
    }
  }, [isClient, loading, mapType])

  // On mount or data refresh, default to a view that shows a 5km radius around the person/first device/default center
  useEffect(() => {
    if (!isClient || loading || !mapRef.current) return
    handleResetView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, loading])

  if (loading || !isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-900">
      {/* Map Container - Full height */}
      <div className="relative w-full h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)] lg:h-[calc(100vh-6rem)]">
        <DynamicMap
          ref={mapRef}
          devices={devices.filter(device => device.location)}
          safetyZones={safetyZones}
          selectedDevice={selectedDevice}
          onDeviceClick={setSelectedDevice}
          mapType={mapType}
          className="w-full h-full"
          pickCenterActive={pickCenter.active}
          onMapClick={(coords) => {
            setPickCenter({ active: false, coords })
            setShowAddModal(true)
          }}
          tempZone={pickCenter.coords ? { center: pickCenter.coords, radius: pendingRadius } : (pickCenter.active && devices[0]?.location ? { center: { latitude: devices[0].location.latitude, longitude: devices[0].location.longitude }, radius: pendingRadius } : null)}
        />

        {/* Map Controls - Positioned over the map */}
        <MapControls
          onChangeMapType={handleChangeMapType}
          mapType={mapType}
        />

        {/* Device Info Panel */}
        <AnimatePresence>
          <DeviceInfoPanel
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
            mapRef={mapRef}
          />
        </AnimatePresence>

        {/* Add Zone Floating Action Button */}
        <div className="absolute bottom-6 right-6 z-[1000]">
          {pickCenter.active ? (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPickCenter({ active: false, coords: null })}
              className="px-4 py-2 rounded-full bg-red-500 text-white shadow-lg flex items-center">
              <X className="w-4 h-4 mr-2" /> Cancel Pick
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPickCenter({ active: true, coords: null })}
              className="px-4 py-2 rounded-full bg-blue-600 text-white shadow-lg flex items-center">
              <PlusCircle className="w-5 h-5 mr-2" /> Add Safety Zone
            </motion.button>
          )}
        </div>

        {/* Pick mode hint */}
        {pickCenter.active && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-white px-4 py-2 rounded-full shadow">
            Click on the map to set the zone center
          </div>
        )}

        {/* Full Add Zone Modal */}
        <AddZoneModal
          isOpen={showAddModal && !!pickCenter.coords}
          onClose={() => setShowAddModal(false)}
          onSave={async (zone) => {
            await addZone(zone)
            setShowAddModal(false)
            setPickCenter({ active: false, coords: null })
          }}
          initialValues={{
            name: '',
            type: 'custom',
            coordinates: pickCenter.coords || undefined,
            radius: pendingRadius,
            enabled: true,
            notifyEntry: true,
            notifyExit: true,
          }}
        />
      </div>
    </div>
  )
}
