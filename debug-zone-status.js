const axios = require('axios');

// Haversine formula to calculate distance
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

async function checkCurrentStatus() {
  try {
    console.log('=== Current Safety Zone Status ===\n');

    // Get device location
    const deviceResponse = await axios.get('http://localhost:3000/api/devices/aneesh_bhaiyya');
    const device = deviceResponse.data.data;
    
    console.log(`Device location: ${device.location.lat}, ${device.location.lng}`);
    console.log(`Last updated: ${device.lastUpdated}\n`);

    // Get safety zones
    const zonesResponse = await axios.get('http://localhost:3000/api/safety-zones');
    const zones = zonesResponse.data.data || [];
    
    console.log(`Found ${zones.length} safety zones:`);
    
    if (zones.length === 0) {
      console.log('❌ No safety zones found - they may have been lost after server restart');
      return;
    }

    zones.forEach((zone, index) => {
      const distance = calculateDistance(
        device.location.lat, device.location.lng,
        zone.coordinates.latitude, zone.coordinates.longitude
      );
      
      const isInside = distance <= zone.radius;
      
      console.log(`\nZone ${index + 1}: ${zone.name}`);
      console.log(`  ID: ${zone.id}`);
      console.log(`  Center: ${zone.coordinates.latitude}, ${zone.coordinates.longitude}`);
      console.log(`  Radius: ${zone.radius}m`);
      console.log(`  Distance from device: ${distance.toFixed(2)}m`);
      console.log(`  Device status: ${isInside ? '🟢 INSIDE' : '🔴 OUTSIDE'} the zone`);
      console.log(`  Enabled: ${zone.enabled}`);
      console.log(`  Entry alerts: ${zone.notifyEntry}`);
      console.log(`  Exit alerts: ${zone.notifyExit}`);
    });

    // Check zone status API
    console.log('\n=== Zone Status API ===');
    const zoneStatusResponse = await axios.get('http://localhost:3000/api/devices/aneesh_bhaiyya/zones');
    const zoneStatus = zoneStatusResponse.data.data;
    console.log(`API reports device is in ${zoneStatus.inZones.length} zones`);
    
    zoneStatus.inZones.forEach(inZone => {
      console.log(`  - In zone: ${inZone.zone.name} (${inZone.distance.toFixed(2)}m from center)`);
    });

    // Check recent alerts
    console.log('\n=== Recent Alerts ===');
    const alertsResponse = await axios.get('http://localhost:3000/api/emergency/alerts');
    const alerts = alertsResponse.data.data || [];
    
    const zoneAlerts = alerts.filter(a => a.type === 'zone_entry' || a.type === 'zone_exit');
    console.log(`Found ${zoneAlerts.length} zone-related alerts:`);
    
    zoneAlerts.forEach(alert => {
      const time = new Date(alert.timestamp).toLocaleString();
      console.log(`  - ${alert.type.toUpperCase()}: ${alert.message} at ${time}`);
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkCurrentStatus();
