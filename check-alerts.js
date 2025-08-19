const axios = require('axios');

async function checkAlerts() {
  try {
    const response = await axios.get('http://localhost:3000/api/emergency/alerts');
    const alerts = response.data.data || [];
    
    console.log(`Found ${alerts.length} alerts:\n`);
    
    alerts.forEach((alert, index) => {
      console.log(`Alert ${index + 1}:`);
      console.log(`  ID: ${alert.id}`);
      console.log(`  Type: ${alert.type}`);
      console.log(`  Message: ${alert.message}`);
      console.log(`  Severity: ${alert.severity}`);
      console.log(`  Device: ${alert.deviceName}`);
      console.log(`  Time: ${alert.timestamp}`);
      console.log(`  Resolved: ${alert.resolved}`);
      if (alert.metadata && alert.metadata.zoneName) {
        console.log(`  Zone: ${alert.metadata.zoneName}`);
      }
      console.log('');
    });

    // Also check device location
    const deviceResponse = await axios.get('http://localhost:3000/api/devices/aneesh_bhaiyya');
    const device = deviceResponse.data.data;
    console.log(`Current device location: ${device.location.lat}, ${device.location.lng}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAlerts();
