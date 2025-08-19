"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  MapPin, 
  Users, 
  AlertTriangle, 
  Settings,
  Bell,
  Menu,
  X,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DashboardOverview from '@/components/DashboardOverview'
import DeviceManagement from '@/components/DeviceManagement'
import MapView from '@/components/MapView'
import SafetyZones from '@/components/SafetyZones'
import EmergencyAlerts from '@/components/EmergencyAlerts'
import SettingsPanel from '@/components/SettingsPanel'

const navigation = [
  { name: 'Overview', icon: Home, id: 'overview' },
  { name: 'Live Map', icon: MapPin, id: 'map' },
  { name: 'Devices', icon: Users, id: 'devices' },
  { name: 'Safety Zones', icon: Shield, id: 'safety-zones' },
  { name: 'Alerts', icon: AlertTriangle, id: 'alerts' },
  { name: 'Settings', icon: Settings, id: 'settings' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start with false to prevent hydration mismatch
  const [notifications, setNotifications] = useState(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Set client-side flag to prevent hydration issues
    setIsClient(true)
    
    // Simulate real-time notifications
    const interval = setInterval(() => {
      setNotifications(prev => Math.floor(Math.random() * 5))
    }, 30000)

    // Handle responsive sidebar behavior
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true) // Always show on desktop
      } else {
        setSidebarOpen(false) // Hide on mobile by default
      }
    }

    // Set initial state after component mounts
    handleResize()
    
    // Listen for resize events
    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />
      case 'map':
        return <MapView />
      case 'devices':
        return <DeviceManagement />
      case 'safety-zones':
        return <SafetyZones />
      case 'alerts':
        return <EmergencyAlerts />
      case 'settings':
        return <SettingsPanel />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isClient && sidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: sidebarOpen ? 320 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "z-40 bg-white/95 dark:bg-slate-900/95",
          "backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-xl",
          "overflow-hidden flex-shrink-0",
          "lg:relative lg:block",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50",
          sidebarOpen ? "block" : "hidden max-lg:hidden"
        )}
        style={{ width: sidebarOpen ? '320px' : '0px' }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  SmartVision
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Family Safety Tracker
                </p>
              </div>
            </motion.div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  setActiveTab(item.id)
                  // Only close sidebar on mobile screens (client-side only)
                  if (isClient && window.innerWidth < 1024) {
                    setSidebarOpen(false)
                  }
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                  "hover:bg-slate-100 dark:hover:bg-slate-800/50",
                  activeTab === item.id
                    ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/30"
                    : "text-slate-600 dark:text-slate-300"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  activeTab === item.id ? "text-blue-500" : "text-slate-400"
                )} />
                <span className="font-medium">{item.name}</span>
                {item.id === 'alerts' && notifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {notifications}
                  </motion.span>
                )}
              </motion.button>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  User Admin
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  admin@smartvision.com
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        sidebarOpen ? "lg:ml-0" : "lg:ml-0"
      )}>
        {/* Top bar */}
        <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-4 lg:px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 rounded-xl bg-white/90 border border-slate-200/60 hover:bg-white dark:bg-slate-800/90 dark:border-slate-700/60 dark:hover:bg-slate-700 transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm"
                title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              <motion.h2
                key={activeTab}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-slate-900 dark:text-white capitalize"
              >
                {navigation.find(nav => nav.id === activeTab)?.name || 'Dashboard'}
              </motion.h2>
            </div>

            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {notifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    {notifications}
                  </motion.span>
                )}
              </motion.button>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  System Online
                </span>
              </motion.div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'map' ? (
            <div className="h-full">
              <MapView />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  )
}
