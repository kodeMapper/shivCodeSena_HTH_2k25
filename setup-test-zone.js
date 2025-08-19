const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const DEVICE_ID = 'aneesh_bhaiyya';

async function setupBoundaryTest() {
  try {
    console.log('Setting up boundary violation test...\n');

    // 1. Create a safety zone around Nagpur (where ESP32 sends coordinates)
    console.log('Creating safety zone around Nagpur coordinates...');
    const zoneResponse = await axios.post(`${API_BASE}/safety-zones`, {
      name: 'Home Zone',
      type: 'home',
      coordinates: { 
        latitude: 21.17662638279427,  // Base coordinates from ESP32 config
        longitude: 79.0616383891541 
      },
      radius: 200, // 200 meters - small zone for easy testing
      enabled: true,
      notifyEntry: true,
      notifyExit: true
    });
    
    const zone = zoneResponse.data.data;
    console.log(`✓ Zone created: "${zone.name}" (ID: ${zone.id})`);
    console.log(`  Center: ${zone.coordinates.latitude}, ${zone.coordinates.longitude}`);
    console.log(`  Radius: ${zone.radius}m\n`);

    console.log('🟢 Zone is ready! Now run your ESP32 simulator.');
    console.log('📍 ESP32 coordinates will vary around:');
    console.log(`   Base: ${21.17662638279427}, ${79.0616383891541}`);
    console.log(`   Variation: ±0.0025 degrees (~275m radius)`);
    console.log('\n📱 ESP32 should sometimes be inside and sometimes outside the 200m zone.');
    console.log('💬 Watch the backend logs and frontend alerts for boundary violations!\n');

    console.log('Zone details:');
    console.log(`  - Entry alerts: ${zone.notifyEntry ? 'ON' : 'OFF'}`);
    console.log(`  - Exit alerts: ${zone.notifyExit ? 'ON' : 'OFF'}`);
    console.log(`  - Status: ${zone.enabled ? 'ENABLED' : 'DISABLED'}`);

    console.log('\n⚠️  To delete this test zone later, run:');
    console.log(`   DELETE http://localhost:3000/api/safety-zones/${zone.id}`);

  } catch (error) {
    console.error('Setup failed:', error.response?.data || error.message);
  }
}

setupBoundaryTest();
