const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function createLargeTestZone() {
  try {
    console.log('Creating a LARGE safety zone to match ESP32 variation...\n');

    // Delete any existing zones first
    try {
      const zonesResponse = await axios.get(`${API_BASE}/safety-zones`);
      const zones = zonesResponse.data.data || [];
      
      for (const zone of zones) {
        await axios.delete(`${API_BASE}/safety-zones/${zone.id}`);
        console.log(`Deleted existing zone: ${zone.name}`);
      }
    } catch (e) {
      // No existing zones to delete
    }

    // Create a large zone - 1500m radius to capture the ESP32's ±0.025 degree variation
    const zoneResponse = await axios.post(`${API_BASE}/safety-zones`, {
      name: 'Large Test Zone',
      type: 'home',
      coordinates: { 
        latitude: 21.17662638279427,  // Base coordinates from ESP32 config
        longitude: 79.0616383891541 
      },
      radius: 1500, // 1.5km radius - should catch most ESP32 variations
      enabled: true,
      notifyEntry: true,
      notifyExit: true
    });
    
    const zone = zoneResponse.data.data;
    console.log(`✓ Large zone created: "${zone.name}" (ID: ${zone.id})`);
    console.log(`  Center: ${zone.coordinates.latitude}, ${zone.coordinates.longitude}`);
    console.log(`  Radius: ${zone.radius}m (1.5km)\n`);

    console.log('🟢 Large zone is ready!');
    console.log('📍 With ESP32 ±0.025 degree variation (~2.75km radius):');
    console.log('   - Device will sometimes be INSIDE the 1.5km zone');
    console.log('   - Device will sometimes be OUTSIDE the 1.5km zone');
    console.log('   - This should trigger boundary violation alerts!\n');

    // Calculate expected distances
    console.log('📊 Expected behavior:');
    console.log('   - ESP32 varies coordinates by ±0.025 degrees');
    console.log('   - That\'s roughly ±2.75km from center');
    console.log('   - Safety zone radius: 1.5km');
    console.log('   - Device should cross boundaries frequently\n');

    console.log('💬 Now watch for boundary violation alerts!');

  } catch (error) {
    console.error('Setup failed:', error.response?.data || error.message);
  }
}

createLargeTestZone();
