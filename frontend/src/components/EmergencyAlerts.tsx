"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, MapPin, X } from 'lucide-react'
import { EmergencyAlert } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { emergencyApi } from '@/lib/api'

const EmergencyAlerts = () => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadAlerts = async () => {
    try {
      const list = await emergencyApi.getAlerts()
      setAlerts(list as any)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    const id = setInterval(loadAlerts, 5000)
    return () => clearInterval(id)
  }, [])

  const getSeverityColor = (severity: EmergencyAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-slate-500'
    }
  }

  const getTypeIcon = (type: EmergencyAlert['type']) => {
    switch (type) {
      case 'manual': return AlertTriangle
      case 'fall': return AlertTriangle
      case 'geofence': return MapPin
      case 'zone_entry': return MapPin
      case 'zone_exit': return AlertTriangle
      default: return AlertTriangle
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Emergency Alerts</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Monitor and respond to safety alerts</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="text-slate-500 dark:text-slate-400">Loading alerts…</div>
        )}
        {!loading && alerts.length === 0 && (
          <div className="text-slate-500 dark:text-slate-400">No alerts</div>
        )}
        {alerts.map((alert, index) => {
          const TypeIcon = getTypeIcon(alert.type)
          
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border",
                alert.resolved 
                  ? "border-slate-200/50 dark:border-slate-700/50"
                  : "border-red-200/50 dark:border-red-700/50 bg-red-50/50 dark:bg-red-900/10"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    getSeverityColor(alert.severity)
                  )}>
                    <TypeIcon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {alert.deviceName}
                      </h3>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        getSeverityColor(alert.severity).replace('bg-', 'bg-') + " text-white"
                      )}>
                        {alert.severity}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 capitalize">
                        {alert.type}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-400 mb-3">
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(alert.timestamp)}</span>
                      </div>
                      
                      {alert.coordinates && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span className="font-mono">
                            {alert.coordinates.latitude.toFixed(4)}, {alert.coordinates.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {alert.resolved && alert.resolvedAt && (
                      <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-300">
                          <CheckCircle className="w-4 h-4" />
                          <span>Resolved by {alert.resolvedBy} on {formatDate(alert.resolvedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {alert.resolved ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        onClick={async () => {
                          try {
                            const resolved = await emergencyApi.resolveAlert(alert.id)
                            setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved: true, resolvedAt: (resolved as any).resolvedAt || new Date().toISOString() } : a))
                          } catch {}
                        }}
                      >
                        Resolve
                      </motion.button>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default EmergencyAlerts
