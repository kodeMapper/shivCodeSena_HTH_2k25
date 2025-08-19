"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, MapPin, Edit, Trash2, MoreVertical } from 'lucide-react'
import { SafetyZone } from '@/types'
import { cn, formatDistance } from '@/lib/utils'
// import { safetyZoneApi } from '@/lib/api' // now handled via ZonesContext
import { useZones } from '@/context/ZonesContext'
import AddZoneModal from '@/components/AddZoneModal'

// Replaced local modal with shared AddZoneModal component

const SafetyZones = () => {
  const { zones, addZone, updateZone, deleteZone: removeZone, refreshZones } = useZones()
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    // Load from server only if we don't have anything yet
    if (zones.length === 0) {
      refreshZones()
    }
  }, [refreshZones, zones.length])

  const handleAddZone = async (zoneData: Omit<SafetyZone, 'id'>) => { await addZone(zoneData) }

  const toggleZone = async (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return
    await updateZone(zoneId, { enabled: !zone.enabled })
  }

  const handleDeleteZone = async (zoneId: string) => { await removeZone(zoneId) }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Safety Zones</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Configure geofence areas for notifications</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Add Zone</span>
        </motion.button>
      </div>

      <div className="grid gap-6">
        {zones.map((zone, index) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  zone.type === 'home' ? 'bg-green-500' :
                  zone.type === 'school' ? 'bg-blue-500' :
                  zone.type === 'work' ? 'bg-purple-500' : 'bg-slate-500'
                )}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{zone.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{zone.type} Zone</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleZone(zone.id)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    zone.enabled ? "bg-green-500 hover:bg-green-600" : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                  )}
                  aria-pressed={zone.enabled}
                  role="switch"
                  aria-label={zone.enabled ? 'Disable zone' : 'Enable zone'}
                >
                  <span className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                    zone.enabled ? "translate-x-5" : "translate-x-1"
                  )} />
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeleteZone(zone.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Radius:</span>
                <p className="font-medium text-slate-900 dark:text-white">{formatDistance(zone.radius)}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Entry Alerts:</span>
                <p className={cn(
                  "font-medium",
                  zone.notifyEntry ? "text-green-600 dark:text-green-400" : "text-slate-600 dark:text-slate-400"
                )}>
                  {zone.notifyEntry ? 'On' : 'Off'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Exit Alerts:</span>
                <p className={cn(
                  "font-medium",
                  zone.notifyExit ? "text-green-600 dark:text-green-400" : "text-slate-600 dark:text-slate-400"
                )}>
                  {zone.notifyExit ? 'On' : 'Off'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Location:</span>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  {zone.coordinates.latitude.toFixed(4)}, {zone.coordinates.longitude.toFixed(4)}
                </p>
              </div>
            </div>

            {zone.type === 'home' && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-xs text-green-700 dark:text-green-300">
                  🏠 Primary safe zone - notifications enabled for all family members
                </p>
              </div>
            )}
          </motion.div>
        ))}

        {zones.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Safety Zones</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Create your first safety zone to get notifications when family members enter or leave important locations.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Your First Zone
            </motion.button>
          </div>
        )}
      </div>

      <AddZoneModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
  onSave={handleAddZone}
  initialValues={{ coordinates: { latitude: 21.17662638279427, longitude: 79.0616383891541 } }}
      />
    </div>
  )
}

export default SafetyZones
