"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Bell, 
  Shield, 
  Moon, 
  Globe, 
  Smartphone,
  Mail,
  MessageSquare,
  Save
} from 'lucide-react'

const SettingsPanel = () => {
  const [notifications, setNotifications] = useState({
    emergency: true,
    geofence: true,
    battery: true,
    offline: false,
    email: true,
    sms: false,
    push: true
  })

  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: 'en',
    updateInterval: 30,
    mapProvider: 'openstreetmap'
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Configure your SmartVision preferences</p>
      </div>

      <div className="grid gap-8">
        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'emergency', label: 'Emergency Alerts', description: 'Critical safety notifications' },
                { key: 'geofence', label: 'Geofence Alerts', description: 'Zone entry/exit notifications' },
                { key: 'battery', label: 'Battery Warnings', description: 'Low battery notifications' },
                { key: 'offline', label: 'Device Offline', description: 'When devices go offline' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      notifications[key as keyof typeof notifications] 
                        ? 'bg-blue-500' 
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifications[key as keyof typeof notifications] ? 24 : 0 }}
                      className="w-5 h-5 bg-white rounded-full shadow-md"
                    />
                  </motion.button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-3">Notification Methods</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'email', label: 'Email', icon: Mail },
                  { key: 'sms', label: 'SMS', icon: MessageSquare },
                  { key: 'push', label: 'Push', icon: Smartphone }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-slate-500" />
                      <span className="font-medium text-slate-900 dark:text-white">{label}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notifications[key as keyof typeof notifications] 
                          ? 'bg-blue-500' 
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <motion.div
                        animate={{ x: notifications[key as keyof typeof notifications] ? 24 : 0 }}
                        className="w-5 h-5 bg-white rounded-full shadow-md"
                      />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Preferences</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Moon className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Toggle dark theme</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setPreferences(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.darkMode ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: preferences.darkMode ? 24 : 0 }}
                  className="w-5 h-5 bg-white rounded-full shadow-md"
                />
              </motion.button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Language</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Interface language</p>
                </div>
              </div>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Update Interval</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">How often to refresh location data</p>
              </div>
              <select
                value={preferences.updateInterval}
                onChange={(e) => setPreferences(prev => ({ ...prev, updateInterval: Number(e.target.value) }))}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

export default SettingsPanel
