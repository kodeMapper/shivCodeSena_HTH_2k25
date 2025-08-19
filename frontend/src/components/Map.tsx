"use client"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useAddress, formatAddressShort } from '@/lib/useAddress'
import { Device, SafetyZone } from '@/types'

// Define interfaces for props and ref
interface MapProps {
  devices: Device[]
  safetyZones: SafetyZone[]
  selectedDevice?: Device | null
  onDeviceClick?: (device: Device) => void
  mapType: 'satellite' | 'street' | 'dark'
  className?: string
  // Interactive Pick Center Mode
  pickCenterActive?: boolean
  onMapClick?: (coords: { latitude: number; longitude: number }) => void
  // Optional temporary circle preview
  tempZone?: { center: { latitude: number; longitude: number }; radius: number } | null
}

interface MapRef {
  zoomIn: () => void
  zoomOut: () => void
  setView: (center: [number, number], zoom: number) => void
  fitBounds: (bounds: any, options?: any) => void
  getMap: () => any
  openPopupForDevice: (deviceId: string) => void
}

// Client-side only map component
const InteractiveMap = forwardRef<MapRef, MapProps>(({ 
  devices, 
  safetyZones, 
  selectedDevice, 
  onDeviceClick, 
  mapType,
  className,
  pickCenterActive = false,
  onMapClick,
  tempZone = null
}, ref) => {
  const [isClient, setIsClient] = useState(false)
  const [MapContainer, setMapContainer] = useState<any>(null)
  const [TileLayer, setTileLayer] = useState<any>(null)
  const [Marker, setMarker] = useState<any>(null)
  const [Popup, setPopup] = useState<any>(null)
  const [Circle, setCircle] = useState<any>(null)
  const [CircleMarker, setCircleMarker] = useState<any>(null)
  const [L, setL] = useState<any>(null)
  const mapRef = useRef<any>(null)

  // Tile layer configurations
  const tileLayers = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles © Esri'
    },
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap contributors © CARTO'
    }
  }

  // Load Leaflet only on client-side
  useEffect(() => {
    let mounted = true

    const loadLeaflet = async () => {
      try {
        // Dynamically import react-leaflet components
        const [
          { MapContainer: MC },
          { TileLayer: TL },
          { Marker: M },
          { Popup: P },
          { Circle: C },
          { CircleMarker: CM },
          leaflet
        ] = await Promise.all([
          import('react-leaflet').then(m => ({ MapContainer: m.MapContainer })),
          import('react-leaflet').then(m => ({ TileLayer: m.TileLayer })),
          import('react-leaflet').then(m => ({ Marker: m.Marker })),
          import('react-leaflet').then(m => ({ Popup: m.Popup })),
          import('react-leaflet').then(m => ({ Circle: m.Circle })),
          import('react-leaflet').then(m => ({ CircleMarker: m.CircleMarker })),
          import('leaflet')
        ])

        if (mounted) {
          // Fix leaflet default markers
          try {
            delete (leaflet.Icon.Default.prototype as any)._getIconUrl
          } catch {}
          try {
            leaflet.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            })
          } catch {}

          setMapContainer(() => MC)
          setTileLayer(() => TL)
          setMarker(() => M)
          setPopup(() => P)
          setCircle(() => C)
          setCircleMarker(() => CM)
          setL(leaflet.default || leaflet)
          setIsClient(true)
        }
      } catch (error) {
        console.error('Failed to load Leaflet:', error)
      }
    }

    loadLeaflet()

    return () => {
      mounted = false
    }
  }, [])

  // Create device icon
  const createDeviceIcon = (device: Device) => {
    if (!L) return null
    
    const color = device.status === 'online' ? '#10b981' : 
                 device.status === 'emergency' ? '#ef4444' : '#6b7280'
    
    return L.divIcon({
      html: `
        <div style="
          width: 28px; 
          height: 28px; 
          background-color: ${color}; 
          border: 3px solid white; 
          box-sizing: border-box;
          border-radius: 50%; 
          box-shadow: 0 3px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          ${device.name.charAt(0).toUpperCase()}
        </div>
      `,
      className: 'custom-device-marker stable-location-marker',
  iconSize: [28, 28],
  // Bottom-center anchor so the marker's anchor point matches the popup tip pixel
  iconAnchor: [14, 28],
    })
  }

  // State to track which device popup is open
  const [openPopupDeviceId, setOpenPopupDeviceId] = useState<string | null>(null)

  // Per-device marker with toggle behavior: click "A" shows popup and hides marker, click outside hides popup and shows marker
  const DeviceMarker = ({ device }: { device: Device }) => {
    const lat = device.location?.latitude
    const lng = device.location?.longitude
    const { address } = useAddress(lat, lng)
    const isPopupOpen = openPopupDeviceId === device.deviceId
    
    if (!device.location) return null
    
    return (
      <>
        {/* Show marker only when popup is closed */}
        {!isPopupOpen && (
          <Marker
            key={device.deviceId}
            position={[device.location.latitude, device.location.longitude]}
            icon={createDeviceIcon(device)}
            eventHandlers={{
              click: (e: any) => {
                onDeviceClick?.(device)
                setOpenPopupDeviceId(device.deviceId)
                // Prevent event bubbling to map
                e.originalEvent?.stopPropagation()
              }
            }}
          />
        )}
        
        {/* Show popup only when open */}
    {isPopupOpen && L && (
          <Popup
            position={[device.location.latitude, device.location.longitude]}
            closeButton={false}
            autoClose={false}
            closeOnClick={false}
            closeOnEscapeKey={false}
      // No offset so popup tip sits at the exact same lat/lng
            eventHandlers={{
              remove: () => {
                // When popup is removed, bring back the marker
                setOpenPopupDeviceId(null)
              }
            }}
          >
            <div 
              className="custom-popup p-4 min-w-[240px] bg-white text-slate-900 rounded-lg shadow-lg border border-slate-200"
              onClick={(e) => {
                // Prevent popup content clicks from closing the popup
                e.stopPropagation()
              }}
            >
              <div className="popup-title text-lg font-semibold mb-2 text-slate-900 flex items-center justify-between">
                <span>{device.name}</span>
                <button
                  onClick={() => setOpenPopupDeviceId(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <div className="popup-address text-sm font-medium text-slate-700">
                {formatAddressShort(address) || `${device.location.latitude.toFixed(6)}, ${device.location.longitude.toFixed(6)}`}
              </div>
            </div>
          </Popup>
        )}
      </>
    )
  }

  // Get zone color
  const getZoneColor = (type: SafetyZone['type']) => {
    switch (type) {
      case 'home': return '#10b981'
      case 'school': return '#3b82f6'
      case 'work': return '#8b5cf6'
      case 'custom': return '#6b7280'
      default: return '#6b7280'
    }
  }

  // Styles that adapt to map type for better visibility
  const getZoneStyle = (type: SafetyZone['type']) => {
    const base = getZoneColor(type)
    if (mapType === 'satellite') {
      return { color: '#ffffff', fillColor: base, fillOpacity: 0.30, weight: 2 }
    }
    if (mapType === 'dark') {
      return { color: '#e5e7eb', fillColor: base, fillOpacity: 0.25, weight: 2 }
    }
    return { color: base, fillColor: base, fillOpacity: 0.18, weight: 2 }
  }

  const getDotStyle = () => {
    if (mapType === 'satellite') {
      return { color: '#ffffff', fillColor: '#ef4444', fillOpacity: 0.95, weight: 2 }
    }
    if (mapType === 'dark') {
      return { color: '#f8fafc', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }
    }
    return { color: '#ffffff', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }
  }

  // Stronger variant for the exact person location
  const getDotStyleStrong = () => {
    const base = getDotStyle()
    return { ...base, weight: 3 }
  }

  const getTempZoneStyle = () => {
    if (mapType === 'satellite') {
      return { color: '#ffffff', dashArray: '6,8', fillColor: '#38bdf8', fillOpacity: 0.18, weight: 2 }
    }
    if (mapType === 'dark') {
      return { color: '#e5e7eb', dashArray: '6,8', fillColor: '#60a5fa', fillOpacity: 0.18, weight: 2 }
    }
    return { color: '#0ea5e9', dashArray: '6,8', fillColor: '#38bdf8', fillOpacity: 0.12, weight: 2 }
  }

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    setView: (center: [number, number], zoom: number) => mapRef.current?.setView(center, zoom),
    fitBounds: (bounds: any, options?: any) => mapRef.current?.fitBounds(bounds, options),
  getMap: () => mapRef.current,
  openPopupForDevice: (deviceId: string) => setOpenPopupDeviceId(deviceId)
  }))

  const notReady = !isClient || !MapContainer || !TileLayer || !Marker || !Popup || !Circle || !CircleMarker

  // Resolve address for selected device (used by side panels); popup now lives on device markers
  const selLat = selectedDevice?.location?.latitude
  const selLng = selectedDevice?.location?.longitude
  const { address: selAddress } = useAddress(selLat, selLng)

  const defaultCenter: [number, number] = [21.17662638279427, 79.0616383891541]
  const defaultZoom = 13
  const currentLayer = tileLayers[mapType]

  // Invalidate size on relevant changes to fix partial tile rendering
  useEffect(() => {
    const map = mapRef.current
    if (!map || typeof map.invalidateSize !== 'function') return
    try { map.invalidateSize(false) } catch {}
  }, [mapType, devices.length, safetyZones.length])

  // Observe container resize to keep Leaflet layout in sync
  useEffect(() => {
    const map = mapRef.current
    if (!map || typeof map.getContainer !== 'function') return
    const container = map.getContainer?.() || document.querySelector('.map-container')
    if (!container || !(window as any).ResizeObserver) return
    const ro = new ResizeObserver(() => {
      try { map.invalidateSize(false) } catch {}
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Map click handler (enabled only in pickCenterActive mode or for closing popups)
  useEffect(() => {
    const map = mapRef.current
    if (!map || typeof map.on !== 'function') return
    const handleClick = (e: any) => {
      if (pickCenterActive && e?.latlng) {
        const { lat, lng } = e.latlng
        onMapClick?.({ latitude: lat, longitude: lng })
      } else {
        // Close any open popup when clicking on map
        setOpenPopupDeviceId(null)
      }
    }
    map.on('click', handleClick)
    return () => {
      try { map.off('click', handleClick) } catch {}
    }
  }, [pickCenterActive, onMapClick])

  // Add keyboard handler for Escape key to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openPopupDeviceId) {
        setOpenPopupDeviceId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openPopupDeviceId])

  if (notReady) {
    return (
      <div className={`w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center ${className || ''}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2 animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">Loading Map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`map-container ${className || ''}`}>
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          width: '100%'
        }}
      >
        <MapContainer
          center={devices.length > 0 && devices[0].location 
            ? [devices[0].location.latitude, devices[0].location.longitude] 
            : defaultCenter}
          zoom={defaultZoom}
          style={{ 
            height: '100%', 
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          zoomControl={false}
          ref={mapRef}
          whenReady={(e: any) => {
            // Ensure tiles render correctly after initial mount
            try {
              setTimeout(() => e.target.invalidateSize(false), 100)
            } catch {}
          }}
          attributionControl={true}
        >
        <TileLayer
          url={currentLayer.url}
          attribution={currentLayer.attribution}
          maxZoom={18}
        />

  {/* Device Markers with address popup */}
        {devices.map((device) => (
          <DeviceMarker key={device.deviceId} device={device} />
        ))}

  {/* Removed blinking location marker; address popup is on the device marker itself */}

        {/* Safety Zone Circles */}
    {safetyZones.filter(zone => zone.enabled).map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.coordinates.latitude, zone.coordinates.longitude]}
            radius={zone.radius}
      pathOptions={getZoneStyle(zone.type)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-slate-900 mb-1">{zone.name}</h3>
                <p className="text-sm text-slate-600 capitalize">{zone.type} Safety Zone</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Radius:</span>
                    <span className="font-medium">{zone.radius}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entry Alert:</span>
                    <span className={zone.notifyEntry ? 'text-green-600' : 'text-red-600'}>
                      {zone.notifyEntry ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exit Alert:</span>
                    <span className={zone.notifyExit ? 'text-green-600' : 'text-red-600'}>
                      {zone.notifyExit ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Zone center red dot for clarity */}
    {safetyZones.filter(z => z.enabled).map((z) => (
          <CircleMarker
            key={`${z.id}-center`}
            center={[z.coordinates.latitude, z.coordinates.longitude]}
      radius={4}
      pathOptions={getDotStyle()}
          />
        ))}

        {/* Temporary Zone Preview */}
        {tempZone && (
          <Circle
            center={[tempZone.center.latitude, tempZone.center.longitude]}
            radius={tempZone.radius}
            pathOptions={getTempZoneStyle()}
          />
        )}
      </MapContainer>
      </div>
    </div>
  )
})

InteractiveMap.displayName = 'InteractiveMap'

export default InteractiveMap
