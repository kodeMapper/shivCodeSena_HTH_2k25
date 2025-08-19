#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_DEVICE_ID = 'TEST_ESP32_001';

async function testAPI() {
  console.log('🧪 Testing SmartVision API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health Check: ${health.data.status}\n`);

    // Test 2: Update Location
    console.log('2. Testing Location Update...');
    const locationData = {
      lat: 37.7749,
      lng: -122.4194,
      accuracy: 5.0
    };
    const locationResponse = await axios.post(`${BASE_URL}/update-location`, locationData, {
      headers: { 'X-Device-ID': TEST_DEVICE_ID }
    });
    console.log(`✅ Location Update: ${locationResponse.data.status}\n`);

    // Test 3: Update Steps
    console.log('3. Testing Steps Update...');
    const stepsData = { steps: 1250 };
    const stepsResponse = await axios.post(`${BASE_URL}/update-steps`, stepsData, {
      headers: { 'X-Device-ID': TEST_DEVICE_ID }
    });
    console.log(`✅ Steps Update: ${stepsResponse.data.totalSteps} steps\n`);

    // Test 4: Get Latest Location
    console.log('4. Testing Get Latest Location...');
    const latestLocation = await axios.get(`${BASE_URL}/latest-location`, {
      headers: { 'X-Device-ID': TEST_DEVICE_ID }
    });
    console.log(`✅ Latest Location: ${latestLocation.data.lat}, ${latestLocation.data.lng}\n`);

    // Test 5: Get Latest Steps
    console.log('5. Testing Get Latest Steps...');
    const latestSteps = await axios.get(`${BASE_URL}/latest-steps`, {
      headers: { 'X-Device-ID': TEST_DEVICE_ID }
    });
    console.log(`✅ Latest Steps: ${latestSteps.data.totalSteps}\n`);

    // Test 6: Calculate Route
    console.log('6. Testing Route Calculation...');
    const routeData = {
      start_lat: 37.7749,
      start_lng: -122.4194,
      end_lat: 37.7849,
      end_lng: -122.4094
    };
    const routeResponse = await axios.post(`${BASE_URL}/calculate-route`, routeData, {
      headers: { 'X-Device-ID': TEST_DEVICE_ID }
    });
    console.log(`✅ Route Calculation: ${Math.round(routeResponse.data.distance)}m, ${Math.round(routeResponse.data.duration/60)}min\n`);

    // Test 7: Geocoding
    console.log('7. Testing Geocoding...');
    const geocodeResponse = await axios.get(`${BASE_URL}/geocode?query=San Francisco`);
    console.log(`✅ Geocoding: Found ${geocodeResponse.data.results.length} results\n`);

    // Test 8: Device Analytics
    console.log('8. Testing Device Analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/device/${TEST_DEVICE_ID}/analytics`);
    console.log(`✅ Analytics: ${analyticsResponse.data.statistics.totalLocationsRecorded} locations recorded\n`);

    // Test 9: Emergency Alert
    console.log('9. Testing Emergency Alert...');
    const emergencyData = {
      type: 'test',
      message: 'Test emergency alert',
      location: { lat: 37.7749, lng: -122.4194 }
    };
    const emergencyResponse = await axios.post(`${BASE_URL}/emergency-alert`, emergencyData, {
      headers: { 'X-Device-ID': TEST_DEVICE_ID }
    });
    console.log(`✅ Emergency Alert: ${emergencyResponse.data.status}\n`);

    console.log('🎉 All tests passed! API is working correctly.\n');
    
    // Performance Test
    console.log('🚀 Running performance test...');
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(axios.get(`${BASE_URL}/health`));
    }
    await Promise.all(promises);
    const duration = Date.now() - start;
    console.log(`✅ Performance: 10 concurrent requests completed in ${duration}ms\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = testAPI;
