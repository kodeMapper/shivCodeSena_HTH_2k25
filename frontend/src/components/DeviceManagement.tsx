"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Battery, 
  MapPin, 
  Clock, 
  Wifi, 
  WifiOff,
  AlertTriangle,
  Settings,
  Edit,
  Trash2
} from 'lucide-react'
import { Device } from '@/types'
import { deviceApi } from '@/lib/api'
import { useAddress, formatAddressShort } from '@/lib/useAddress'
import { cn, formatDate } from '@/lib/utils'

interface DeviceCardProps {
  device: Device
  onEdit: (device: Device) => void
  onDelete: (deviceId: string) => void
}

const DeviceCard = ({ device, onEdit, onDelete }: DeviceCardProps) => {
  const [showMenu, setShowMenu] = useState(false)
  const lat = device.location?.latitude
  const lng = device.location?.longitude
  const { address } = useAddress(lat, lng)

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'emergency': return 'bg-red-500 animate-pulse'
      case 'offline': return 'bg-slate-400'
      default: return 'bg-slate-400'
    }
  }

  const getStatusText = (status: Device['status']) => {
    switch (status) {
      case 'online': return 'Online'
      case 'emergency': return 'Emergency'
      case 'offline': return 'Offline'
      default: return 'Unknown'
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn("w-3 h-3 rounded-full", getStatusColor(device.status))} />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {device.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {device.deviceId}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </motion.button>
          
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg z-10 py-1 min-w-32"
            >
              <button
                onClick={() => {
                  onEdit(device)
                  setShowMenu(false)
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  onDelete(device.deviceId)
                  setShowMenu(false)
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            getStatusColor(device.status).replace('animate-pulse', '')
          )}>
            {device.status === 'online' ? (
              <Wifi className="w-4 h-4 text-white" />
            ) : (
              <WifiOff className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {getStatusText(device.status)}
            </p>
          </div>
        </div>

        {device.batteryLevel !== undefined && (
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              device.batteryLevel > 20 ? "bg-green-500" : "bg-red-500"
            )}>
              <Battery className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Battery</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {device.batteryLevel}%
              </p>
            </div>
          </div>
        )}
      </div>

      {device.location && (
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {formatAddressShort(address) || `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`}
          </span>
        </div>
      )}

      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Clock className="w-3 h-3" />
        <span>Last seen: {formatDate(device.lastSeen)}</span>
      </div>

      {device.emergency && !device.emergency.resolved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Emergency Alert
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {device.emergency.type} - {formatDate(device.emergency.timestamp)}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'emergency'>('all')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devicesData = await deviceApi.getDevices()
        setDevices(devicesData)
      } catch (error) {
        console.error('Failed to fetch devices:', error)
        // Use minimal fallback seeded with Aneesh
        setDevices([
          {
            deviceId: 'aneesh_bhaiyya',
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
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
  }, [])

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filter === 'all' || device.status === filter
    
    return matchesSearch && matchesFilter
  })

  const handleEdit = (device: Device) => {
    console.log('Edit device:', device)
    // TODO: Open edit modal
  }

  const handleDelete = (deviceId: string) => {
    console.log('Delete device:', deviceId)
    // TODO: Confirm and delete device
  }

  const handleAddDevice = async () => {
    setAdding(true)
    try {
      const id = newId.trim() || 'aneesh_bhaiyya'
      const name = newName.trim() || 'Aneesh Bhaiyya'
      const created = await deviceApi.createDevice(id, name)
      if (created) {
        // Refresh list
        const fresh = await deviceApi.getDevices()
        setDevices(fresh)
        // Broadcast to other tabs/views to resync
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('devices-changed'))
        }
        setNewId('')
        setNewName('')
      }
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Device Management
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage and monitor all connected devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="device id" className="px-2 py-2 rounded-lg border bg-white/80 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-700/50" />
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="name" className="px-2 py-2 rounded-lg border bg-white/80 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-700/50" />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={adding}
            onClick={handleAddDevice}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{adding ? 'Adding...' : 'Add Device'}</span>
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        </div>
        
        <div className="flex space-x-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'online', label: 'Online' },
            { id: 'offline', label: 'Offline' },
            { id: 'emergency', label: 'Emergency' }
          ].map((filterOption) => (
            <motion.button
              key={filterOption.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(filterOption.id as any)}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors",
                filter === filterOption.id
                  ? "bg-blue-500 text-white"
                  : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {filterOption.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <DeviceCard
            key={device.deviceId}
            device={device}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No devices found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first device'
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddDevice}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Device
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  )
}
