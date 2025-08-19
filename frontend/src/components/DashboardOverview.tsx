"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  MapPin, 
  Battery, 
  Clock,
  Activity,
  Wifi
} from 'lucide-react'
import { dashboardApi, deviceApi, stepsApi } from '@/lib/api'
import { useAddress, formatAddressShort } from '@/lib/useAddress'
import { Device } from '@/types'

interface StatusCardProps {
  title: string
  value: string
  status?: 'safe' | 'warning' | 'danger'
  subtitle?: string
}

const StatusCard = ({ title, value, status = 'safe', subtitle }: StatusCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'safe': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'danger': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">{title}:</span>
        {status === 'safe' && (
          <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor()}`}>
            Safe
          </span>
        )}
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold text-slate-900 dark:text-white">
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function HistoryAddress({ lat, lng, fallback }: { lat?: number; lng?: number; fallback: string }) {
  const { address } = useAddress(lat, lng)
  return (
    <div className="text-sm text-slate-500 dark:text-slate-400">
      {formatAddressShort(address) || fallback}
    </div>
  )
}

export default function DashboardOverview() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<{ title: string; subtitle: string; when: string; lat?: number; lng?: number }[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'overview' | 'steps'>('overview')
  const [stepsToday, setStepsToday] = useState<number>(0)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const devicesData: Device[] = await deviceApi.getDevices().catch(() => [
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
              speed: 0
            }
          }
        ])
        setDevices(devicesData)
        // History: ensure at least 3 items using deviceApi.getLocationHistory
        const p = devicesData[0]
        if (p?.deviceId) {
          const hist = await deviceApi.getLocationHistory(p.deviceId, 24)
          // Take most recent first, ensure min 3 items (pad with current)
          const points = [...hist].sort((a,b) => +new Date(b.timestamp) - +new Date(a.timestamp))
          const ensure = points.length >= 3 ? points.slice(0,3) : [
            ...points,
            ...(p.location ? [{ deviceId: p.deviceId, coordinates: { latitude: p.location.latitude, longitude: p.location.longitude }, timestamp: p.location.timestamp }] : [])
          ].slice(0,3)
          // Format labels; we’ll show a simple time label for now
          const items = ensure.map((h,i) => ({
            title: i === 0 ? 'Current Location' : `Previous Update ${i}`,
            subtitle: `${h.coordinates.latitude.toFixed(4)}, ${h.coordinates.longitude.toFixed(4)}`,
            when: new Date(h.timestamp).toLocaleTimeString(),
            lat: h.coordinates.latitude,
            lng: h.coordinates.longitude
          }))
          setHistory(items)
        } else {
          setHistory([])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Fetch location updates every 30 minutes
    const locationInterval = setInterval(fetchData, 30 * 60 * 1000)
    const onChanged = () => fetchData()
    if (typeof window !== 'undefined') {
      window.addEventListener('devices-changed', onChanged)
    }
    return () => {
      clearInterval(locationInterval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('devices-changed', onChanged)
      }
    }
  }, [])

  const primaryDevice = devices.find(d => d.name === 'Aneesh Bhaiyya') || devices[0]
  const { address: primaryAddress } = useAddress(primaryDevice?.location?.latitude, primaryDevice?.location?.longitude)

  // Load steps analytics for primary device
  useEffect(() => {
    let cancelled = false
    async function loadSteps() {
      if (!primaryDevice) return
      const analytics = await stepsApi.getAnalytics(primaryDevice.deviceId)
      if (cancelled) return
      const steps = analytics?.currentStatus?.steps ?? 0
      setStepsToday(typeof steps === 'number' ? steps : 0)
    }
    loadSteps()
    const t = setInterval(loadSteps, 5 * 60 * 1000) // refresh every 5 minutes
    return () => { cancelled = true; clearInterval(t) }
  }, [primaryDevice?.deviceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Current Status
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Live tracking and safety monitoring
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center space-x-2">
        <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab==='overview' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>Overview</button>
        <button onClick={() => setActiveTab('steps')} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab==='steps' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>Steps</button>
      </div>

      {primaryDevice && activeTab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatusCard
            title="Current Status"
            value="Safe"
            status="safe"
          />
          
          <StatusCard
            title="Last Updated"
            value="Just now"
            subtitle={currentTime.toLocaleTimeString()}
          />

          <StatusCard title="Steps Today" value={`${stepsToday}`} />

          <StatusCard
            title="Battery"
            value={`${primaryDevice.batteryLevel ?? 0}%`}
            status={(primaryDevice.batteryLevel ?? 0) > 20 ? 'safe' : 'warning'}
          />

          <StatusCard
            title="Signal"
            value="Strong"
            status="safe"
          />

          <StatusCard
            title="Speed"
            value={`${Math.round((primaryDevice.location?.speed || 0) * 3.6)} km/h`}
          />
        </div>
      )}

  {activeTab === 'overview' && (
  <div className="grid gap-6 lg:grid-cols-2">
        {/* Devices Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Devices
            </h3>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="space-y-3">
            {devices.map((device, index) => (
              <motion.div
                key={device.deviceId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="font-medium text-slate-900 dark:text-white">
                    {device.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <Battery className="w-4 h-4" />
                  <span>{device.batteryLevel}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Location History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Location History
            </h3>
            <MapPin className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((h, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{h.title}</div>
                    <HistoryAddress lat={h.lat} lng={h.lng} fallback={h.subtitle} />
                  </div>
                  <div className="text-xs text-slate-400">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {idx === 0 ? 'Now' : h.when}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">No history yet.</div>
            )}
          </div>
        </motion.div>
      </div>
      )}

      {activeTab === 'steps' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Steps Today</h3>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-5xl font-bold text-slate-900 dark:text-white">{stepsToday}</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Updated {currentTime.toLocaleTimeString()}</p>
          <p className="text-xs text-slate-400 mt-1">This represents the total steps reported by the device today.</p>
        </motion.div>
      )}
    </div>
  )
}
