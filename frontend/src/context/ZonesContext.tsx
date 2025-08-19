"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { SafetyZone } from '@/types'
import { safetyZoneApi } from '@/lib/api'

type ZonesContextValue = {
  zones: SafetyZone[]
  loading: boolean
  refreshZones: () => Promise<void>
  addZone: (zone: Omit<SafetyZone, 'id'>) => Promise<SafetyZone>
  updateZone: (id: string, data: Partial<SafetyZone>) => Promise<SafetyZone | null>
  deleteZone: (id: string) => Promise<boolean>
}

const ZonesContext = createContext<ZonesContextValue | undefined>(undefined)

const STORAGE_KEY = 'safetyZones'

// Utility functions for localStorage
const saveZonesToStorage = (zones: SafetyZone[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones))
  } catch (error) {
    console.warn('Failed to save zones to localStorage:', error)
  }
}

const loadZonesFromStorage = (): SafetyZone[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Failed to load zones from localStorage:', error)
    return []
  }
}

export const ZonesProvider = ({ children }: { children: React.ReactNode }) => {
  const [zones, setZones] = useState<SafetyZone[]>([])
  const [loading, setLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    const storedZones = loadZonesFromStorage()
    if (storedZones.length > 0) {
      setZones(storedZones)
    }
  }, [])

  // Save to localStorage whenever zones change
  useEffect(() => {
    if (zones.length > 0) {
      saveZonesToStorage(zones)
    }
  }, [zones])

  const refreshZones = useCallback(async () => {
    try {
      const data = await safetyZoneApi.getZones()
      setZones(data)
      saveZonesToStorage(data)
    } catch (e) {
      // keep existing zones on failure
      console.warn('Failed to refresh zones from server, using local data')
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      // First load from localStorage for immediate display
      const storedZones = loadZonesFromStorage()
      if (storedZones.length > 0) {
        setZones(storedZones)
      }
      
      // Then try to sync with server
      await refreshZones().catch(() => {
        // fallback: keep localStorage data
      })
      setLoading(false)
    }
    init()
  }, [refreshZones])

  const addZone = async (zone: Omit<SafetyZone, 'id'>): Promise<SafetyZone> => {
    const created: SafetyZone = { id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, ...zone }
    
    // Update local state immediately
    setZones(prev => {
      const updated = [...prev, created]
      saveZonesToStorage(updated)
      return updated
    })

    // Try to sync with server
    try {
      const serverZone = await safetyZoneApi.createZone(zone)
      // Update with server response if successful
      setZones(prev => {
        const updated = prev.map(z => z.id === created.id ? serverZone : z)
        saveZonesToStorage(updated)
        return updated
      })
      return serverZone
    } catch (error) {
      console.warn('Failed to sync zone with server, keeping local version:', error)
      return created
    }
  }

  const updateZone = async (id: string, data: Partial<SafetyZone>): Promise<SafetyZone | null> => {
    // Update local state immediately
    setZones(prev => {
      const updated = prev.map(z => z.id === id ? { ...z, ...data } as SafetyZone : z)
      saveZonesToStorage(updated)
      return updated
    })

    // Try to sync with server
    try {
      const updated = await safetyZoneApi.updateZone(id, data)
      setZones(prev => {
        const newZones = prev.map(z => z.id === id ? updated : z)
        saveZonesToStorage(newZones)
        return newZones
      })
      return updated
    } catch (error) {
      console.warn('Failed to sync zone update with server, keeping local version:', error)
      return zones.find(z => z.id === id) ?? null
    }
  }

  const deleteZone = async (id: string): Promise<boolean> => {
    // Update local state immediately
    setZones(prev => {
      const updated = prev.filter(z => z.id !== id)
      saveZonesToStorage(updated)
      return updated
    })

    // Try to sync with server
    try {
      await safetyZoneApi.deleteZone(id)
      return true
    } catch (error) {
      console.warn('Failed to sync zone deletion with server, keeping local deletion:', error)
      return false
    }
  }

  return (
    <ZonesContext.Provider value={{ zones, loading, refreshZones, addZone, updateZone, deleteZone }}>
      {children}
    </ZonesContext.Provider>
  )
}

export const useZones = () => {
  const ctx = useContext(ZonesContext)
  if (!ctx) throw new Error('useZones must be used within ZonesProvider')
  return ctx
}
