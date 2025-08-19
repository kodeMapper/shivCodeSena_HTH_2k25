"use client"

import { useEffect, useMemo, useState } from 'react'
import { reverseGeocodeApi } from '@/lib/api'

const memCache = new Map<string, string>()

function keyFor(lat: number, lng: number, precision = 5) {
  const k = `${lat.toFixed(precision)},${lng.toFixed(precision)}`
  return k
}

export function useAddress(lat?: number, lng?: number) {
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = useMemo(() => (lat != null && lng != null ? keyFor(lat, lng) : null), [lat, lng])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (key == null) return
      if (memCache.has(key)) {
        setAddress(memCache.get(key) || null)
        return
      }
      setLoading(true)
      setError(null)
      const result = await reverseGeocodeApi.lookup(lat!, lng!)
      if (cancelled) return
      if (result?.name) {
        memCache.set(key, result.name)
        setAddress(result.name)
      } else {
        setAddress(null)
        setError('not_found')
      }
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [key, lat, lng])

  return { address, loading, error }
}

export function formatAddressShort(addr?: string | null) {
  if (!addr) return null
  // Take a concise portion: first 3 comma-separated parts
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean)
  return parts.slice(0, 3).join(', ')
}
