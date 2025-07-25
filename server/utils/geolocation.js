// Geolocation utility functions

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Validate location coordinates
const validateCoordinates = (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { isValid: false, message: 'Invalid coordinate types' };
  }

  if (latitude < -90 || latitude > 90) {
    return { isValid: false, message: 'Latitude must be between -90 and 90' };
  }

  if (longitude < -180 || longitude > 180) {
    return { isValid: false, message: 'Longitude must be between -180 and 180' };
  }

  return { isValid: true };
};

// Validate location against company office location
const validateLocation = async (location) => {
  const { latitude, longitude } = location;

  try {
    // Try to get configuration from database first
    const SystemConfig = require('../models/SystemConfig');
    const config = await SystemConfig.getConfig();
    
    // Check if location validation is enabled
    const locationValidationEnabled = config.locationValidation.enabled;
    
    if (!locationValidationEnabled) {
      console.log('Location validation disabled - allowing all locations');
      return {
        isValid: true,
        distance: '0.00',
        message: 'Location validation disabled'
      };
    }

    // Validate coordinates
    const coordinateValidation = validateCoordinates(latitude, longitude);
    if (!coordinateValidation.isValid) {
      return coordinateValidation;
    }

    // Get company office location from database
    const officeLat = config.officeLocation.latitude;
    const officeLon = config.officeLocation.longitude;
    const maxDistance = config.locationValidation.maxDistanceKm;

    // Calculate distance from office
    const distance = calculateDistance(latitude, longitude, officeLat, officeLon);

    // Log debugging information
    console.log('Location validation:', {
      userLocation: { latitude, longitude },
      officeLocation: { latitude: officeLat, longitude: officeLon },
      calculatedDistance: distance.toFixed(2),
      maxAllowedDistance: maxDistance
    });

    if (distance > maxDistance) {
      return {
        isValid: false,
        message: `Location is too far from office. Maximum allowed distance is ${maxDistance}km. Current distance: ${distance.toFixed(2)}km. Please update office location in configuration or contact administrator.`
      };
    }

    return {
      isValid: true,
      distance: distance.toFixed(2)
    };
  } catch (error) {
    console.error('Error getting system configuration:', error);
    
    // Fallback to environment variables if database fails
    const locationValidationEnabled = process.env.LOCATION_VALIDATION_ENABLED === 'true';
    
    if (!locationValidationEnabled) {
      console.log('Location validation disabled (fallback) - allowing all locations');
      return {
        isValid: true,
        distance: '0.00',
        message: 'Location validation disabled'
      };
    }

    // Validate coordinates
    const coordinateValidation = validateCoordinates(latitude, longitude);
    if (!coordinateValidation.isValid) {
      return coordinateValidation;
    }

    // Get company office location from environment variables
    const officeLat = parseFloat(process.env.DEFAULT_LOCATION_LAT) || 0;
    const officeLon = parseFloat(process.env.DEFAULT_LOCATION_LNG) || 0;
    const maxDistance = parseFloat(process.env.MAX_DISTANCE_KM) || 100;

    // Calculate distance from office
    const distance = calculateDistance(latitude, longitude, officeLat, officeLon);

    if (distance > maxDistance) {
      return {
        isValid: false,
        message: `Location is too far from office. Maximum allowed distance is ${maxDistance}km. Current distance: ${distance.toFixed(2)}km. Please update office location in configuration or contact administrator.`
      };
    }

    return {
      isValid: true,
      distance: distance.toFixed(2)
    };
  }
};

// Get address from coordinates using reverse geocoding
const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    // In a real implementation, you would use a geocoding service like Google Maps API
    // For now, we'll return a placeholder
    return {
      address: 'Address not available',
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown'
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      address: 'Address lookup failed',
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown'
    };
  }
};

// Check if location is within working hours
const isWithinWorkingHours = (timestamp, workSchedule) => {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Skip weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  const time = date.toTimeString().slice(0, 5); // HH:MM format
  const { startTime = '09:00', endTime = '17:00' } = workSchedule;

  return time >= startTime && time <= endTime;
};

// Calculate working hours for a day
const calculateWorkingHours = (punchInTime, punchOutTime) => {
  if (!punchInTime || !punchOutTime) {
    return 0;
  }

  const diffMs = new Date(punchOutTime) - new Date(punchInTime);
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.round(diffHours * 100) / 100;
};

// Check if employee is late
const isLate = (punchInTime, workSchedule) => {
  if (!punchInTime || !workSchedule.startTime) {
    return false;
  }

  const punchInDate = new Date(punchInTime);
  const punchInTimeStr = punchInDate.toTimeString().slice(0, 5);
  
  return punchInTimeStr > workSchedule.startTime;
};

// Get timezone offset
const getTimezoneOffset = () => {
  const date = new Date();
  return date.getTimezoneOffset();
};

// Format location for display
const formatLocation = (location) => {
  if (!location || !location.latitude || !location.longitude) {
    return 'Location not available';
  }

  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
};

// Validate IP address location (basic validation)
const validateIPLocation = (ipAddress) => {
  // Basic IP validation
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  if (!ipRegex.test(ipAddress)) {
    return { isValid: false, message: 'Invalid IP address format' };
  }

  // In a real implementation, you might want to check if the IP is from a known VPN
  // or if it's from an expected location range

  return { isValid: true };
};

// Utility: Check if a date is a working day (Mon-Sat)
function isWorkingDay(date) {
  const day = (date instanceof Date ? date : new Date(date)).getDay();
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return day >= 1 && day <= 6;
}

module.exports = {
  calculateDistance,
  validateCoordinates,
  validateLocation,
  getAddressFromCoordinates,
  isWithinWorkingHours,
  calculateWorkingHours,
  isLate,
  getTimezoneOffset,
  formatLocation,
  validateIPLocation,
  isWorkingDay
}; 