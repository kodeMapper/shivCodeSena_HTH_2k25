const axios = require('axios');

async function monitorLocationUpdates() {
  console.log('Monitoring location updates...\n');
  
  let lastLocation = null;
  let updateCount = 0;
  
  const check = async () => {
    try {
      const deviceResponse = await axios.get('http://localhost:3000/api/devices/aneesh_bhaiyya');
      const device = deviceResponse.data.data;
      
      const currentLocation = `${device.location.lat}, ${device.location.lng}`;
      const timestamp = new Date(device.lastUpdated).toLocaleTimeString();
      
      if (currentLocation !== lastLocation) {
        updateCount++;
        console.log(`Update ${updateCount} at ${timestamp}: ${currentLocation}`);
        lastLocation = currentLocation;
        
        // Check if we're getting alerts
        const alertsResponse = await axios.get('http://localhost:3000/api/emergency/alerts');
        const alerts = alertsResponse.data.data || [];
        const recentAlerts = alerts.filter(a => 
          a.type === 'zone_entry' || a.type === 'zone_exit'
        );
        
        if (recentAlerts.length > 0) {
          console.log(`  🚨 Found ${recentAlerts.length} zone alerts!`);
          recentAlerts.forEach(alert => {
            console.log(`    - ${alert.type}: ${alert.message}`);
          });
        }
      } else {
        process.stdout.write('.');
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  };
  
  // Check every 2 seconds
  setInterval(check, 2000);
  
  console.log('Waiting for ESP32 location updates... (press Ctrl+C to stop)');
  check(); // Initial check
}

monitorLocationUpdates();
