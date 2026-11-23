const test = require('node:test');
const assert = require('node:assert/strict');

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

test('Haversine distance calculates accurate proximity in km', () => {
  // VI (6.4281, 3.4219) to Lekki Phase 1 (6.4474, 3.4716) is approx 5.8 km
  const dist = calculateDistanceKm(6.4281, 3.4219, 6.4474, 3.4716);
  assert.ok(dist > 5 && dist < 7, `Expected approx 5.8km, got ${dist}`);
});

test('Zero distance returns 0 km', () => {
  const dist = calculateDistanceKm(6.4281, 3.4219, 6.4281, 3.4219);
  assert.equal(dist, 0);
});
