const axios = require('axios');

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function checkZoneStatus() {
  try {
    // Get device location
    const deviceResponse = await axios.get('http://localhost:3000/api/devices/aneesh_bhaiyya');
    const device = deviceResponse.data.data;
    
    // Get safety zones
    const zonesResponse = await axios.get('http://localhost:3000/api/safety-zones');
    const zones = zonesResponse.data.data || [];
    
    console.log(`Device location: ${device.location.lat}, ${device.location.lng}\n`);
    
    if (zones.length === 0) {
      console.log('No safety zones found');
      return;
    }
    
    zones.forEach(zone => {
      const distance = calculateDistance(
        device.location.lat, device.location.lng,
        zone.coordinates.latitude, zone.coordinates.longitude
      );
      
      const isInside = distance <= zone.radius;
      
      console.log(`Zone: ${zone.name}`);
      console.log(`  Center: ${zone.coordinates.latitude}, ${zone.coordinates.longitude}`);
      console.log(`  Radius: ${zone.radius}m`);
      console.log(`  Distance from device: ${distance.toFixed(2)}m`);
      console.log(`  Device is: ${isInside ? 'INSIDE' : 'OUTSIDE'} the zone`);
      console.log(`  Enabled: ${zone.enabled}`);
      console.log(`  Entry alerts: ${zone.notifyEntry}`);
      console.log(`  Exit alerts: ${zone.notifyExit}`);
      console.log('');
    });
    
    // Check zone status API
    const zoneStatusResponse = await axios.get('http://localhost:3000/api/devices/aneesh_bhaiyya/zones');
    const zoneStatus = zoneStatusResponse.data.data;
    console.log(`API reports device is in ${zoneStatus.inZones.length} zones`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkZoneStatus();
