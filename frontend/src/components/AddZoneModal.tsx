"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'
import { SafetyZone } from '@/types'

export interface AddZoneModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (zone: Omit<SafetyZone, 'id'>) => void
  initialValues?: Partial<Omit<SafetyZone, 'id'>> & {
    coordinates?: { latitude: number; longitude: number }
  }
}

export default function AddZoneModal({ isOpen, onClose, onSave, initialValues }: AddZoneModalProps) {
  const [formData, setFormData] = useState<Omit<SafetyZone, 'id'>>({
    name: '',
    type: 'home',
    coordinates: { latitude: 21.17662638279427, longitude: 79.0616383891541 },
    radius: 200,
    enabled: true,
    notifyEntry: true,
    notifyExit: true,
  })

  useEffect(() => {
    if (!isOpen) return
    setFormData(prev => ({
      ...prev,
      ...initialValues,
      coordinates: initialValues?.coordinates ?? prev.coordinates,
      name: initialValues?.name ?? prev.name,
      type: (initialValues?.type as SafetyZone['type']) ?? prev.type,
      radius: initialValues?.radius ?? prev.radius,
      enabled: initialValues?.enabled ?? prev.enabled,
      notifyEntry: initialValues?.notifyEntry ?? prev.notifyEntry,
      notifyExit: initialValues?.notifyExit ?? prev.notifyExit,
    }))
  }, [isOpen, initialValues])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add New Safety Zone</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Zone Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Home, School, etc."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Zone Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as SafetyZone['type'] }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="home">Home</option>
                <option value="school">School</option>
                <option value="work">Work</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.coordinates.latitude}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coordinates: { ...prev.coordinates, latitude: parseFloat(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.coordinates.longitude}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coordinates: { ...prev.coordinates, longitude: parseFloat(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Radius (meters)</label>
              <input
                type="number"
                min={50}
                max={5000}
                value={formData.radius}
                onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notifyEntry}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifyEntry: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Notify on entry</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notifyExit}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifyExit: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Notify on exit</span>
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Zone
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
