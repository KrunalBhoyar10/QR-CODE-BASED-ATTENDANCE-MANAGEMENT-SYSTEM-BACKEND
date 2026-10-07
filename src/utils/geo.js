/**
 * Geolocation & Geofencing Utility
 * Performs server-side distance calculations using the spherical Haversine formula
 */

/**
 * Calculates great-circle distance between two geographic coordinates in meters
 * @param {number} lat1 Latitude of point 1 (degrees)
 * @param {number} lon1 Longitude of point 1 (degrees)
 * @param {number} lat2 Latitude of point 2 (degrees)
 * @param {number} lon2 Longitude of point 2 (degrees)
 * @returns {number} Distance in meters
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined || lat1 === null ||
    lon1 === undefined || lon1 === null ||
    lat2 === undefined || lat2 === null ||
    lon2 === undefined || lon2 === null
  ) {
    return Infinity;
  }

  const R = 6371000; // Mean radius of Earth in meters
  const toRadians = (deg) => (deg * Math.PI) / 180;

  const phi1 = toRadians(Number(lat1));
  const phi2 = toRadians(Number(lat2));
  const deltaPhi = toRadians(Number(lat2) - Number(lat1));
  const deltaLambda = toRadians(Number(lon2) - Number(lon1));

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Return rounded to 2 decimal places
};

/**
 * Verifies if student's coordinates fall within the session's allowed radius
 * @param {number} studentLat Student latitude
 * @param {number} studentLon Student longitude
 * @param {number} sessionLat Session latitude
 * @param {number} sessionLon Session longitude
 * @param {number} allowedRadiusMeters Allowed geofence radius in meters
 * @returns {{ isWithin: boolean, distanceMeters: number }}
 */
export const verifyGeofence = (studentLat, studentLon, sessionLat, sessionLon, allowedRadiusMeters = 50) => {
  const distanceMeters = calculateDistanceMeters(studentLat, studentLon, sessionLat, sessionLon);
  const isWithin = distanceMeters <= allowedRadiusMeters;

  return {
    isWithin,
    distanceMeters,
    allowedRadiusMeters,
  };
};
