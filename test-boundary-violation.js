const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const DEVICE_ID = 'aneesh_bhaiyya';

// Test boundary violation detection
async function testBoundaryViolation() {
  try {
    console.log('=== Testing Boundary Violation Detection ===\n');

    // 1. Create a safety zone around Nagpur
    console.log('1. Creating safety zone...');
    const zoneResponse = await axios.post(`${API_BASE}/safety-zones`, {
      name: 'Test Zone',
      type: 'home',
      coordinates: { 
        latitude: 21.17662638279427, 
        longitude: 79.0616383891541 
      },
      radius: 500, // 500 meters
      enabled: true,
      notifyEntry: true,
      notifyExit: true
    });
    
    const zoneId = zoneResponse.data.data.id;
    console.log(`Zone created: ${zoneId}\n`);

    // 2. Update device location to be inside the zone
    console.log('2. Moving device inside the zone...');
    await axios.post(`${API_BASE}/update-location`, {
      lat: 21.17662638279427,
      lng: 79.0616383891541,
      accuracy: 10
    }, {
      headers: { 'X-Device-ID': DEVICE_ID }
    });
    console.log('Device moved to center of zone\n');

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Move device outside the zone (boundary violation)
    console.log('3. Moving device OUTSIDE the zone (boundary violation)...');
    await axios.post(`${API_BASE}/update-location`, {
      lat: 21.18, // Move about 2km north
      lng: 79.07,
      accuracy: 10
    }, {
      headers: { 'X-Device-ID': DEVICE_ID }
    });
    console.log('Device moved outside zone - should trigger boundary violation\n');

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Check alerts
    console.log('4. Checking alerts...');
    const alertsResponse = await axios.get(`${API_BASE}/emergency/alerts`);
    const alerts = alertsResponse.data.data || [];
    
    console.log(`Found ${alerts.length} alerts:`);
    alerts.forEach((alert, index) => {
      console.log(`  Alert ${index + 1}:`);
      console.log(`    Type: ${alert.type}`);
      console.log(`    Message: ${alert.message}`);
      console.log(`    Severity: ${alert.severity}`);
      console.log(`    Time: ${alert.timestamp}`);
      console.log(`    Resolved: ${alert.resolved}`);
      if (alert.metadata) {
        console.log(`    Zone: ${alert.metadata.zoneName || 'N/A'}`);
      }
      console.log('');
    });

    // 5. Check device status
    console.log('5. Checking device status...');
    const deviceResponse = await axios.get(`${API_BASE}/devices/${DEVICE_ID}`);
    const device = deviceResponse.data.data;
    
    console.log(`Device location: ${device.location.lat}, ${device.location.lng}`);
    console.log(`Device alerts: ${device.alerts?.length || 0}`);
    console.log(`Current emergency: ${device.emergency ? device.emergency.type : 'None'}`);

    // 6. Check zone status
    console.log('\n6. Checking zone status...');
    const zoneStatusResponse = await axios.get(`${API_BASE}/devices/${DEVICE_ID}/zones`);
    const zoneStatus = zoneStatusResponse.data.data;
    
    console.log(`Zones device is in: ${zoneStatus.inZones.length}`);
    zoneStatus.inZones.forEach(zone => {
      console.log(`  - ${zone.zone.name}: ${zone.distance.toFixed(2)}m away`);
    });

    // Clean up - delete the test zone
    console.log('\n7. Cleaning up test zone...');
    await axios.delete(`${API_BASE}/safety-zones/${zoneId}`);
    console.log('Test zone deleted');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testBoundaryViolation();
