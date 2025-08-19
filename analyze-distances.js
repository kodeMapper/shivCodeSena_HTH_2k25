// Calculate distances for the recent ESP32 locations
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

const centerLat = 21.17662638279427;
const centerLng = 79.0616383891541;
const zoneRadius = 1500; // meters

const recentLocations = [
  [21.17608138, 79.08131339],
  [21.15774138, 79.07900839],
  [21.15771638, 79.05224839],
  [21.19376638, 79.04497339]
];

console.log('Analyzing recent ESP32 locations:');
console.log(`Zone center: ${centerLat}, ${centerLng}`);
console.log(`Zone radius: ${zoneRadius}m\n`);

recentLocations.forEach((loc, index) => {
  const distance = calculateDistance(centerLat, centerLng, loc[0], loc[1]);
  const isInside = distance <= zoneRadius;
  console.log(`Location ${index + 1}: ${loc[0]}, ${loc[1]}`);
  console.log(`  Distance: ${distance.toFixed(2)}m`);
  console.log(`  Status: ${isInside ? 'INSIDE' : 'OUTSIDE'} zone`);
  console.log('');
});
