const SystemMonitor = require('../services/systemMonitor');

// Create a singleton instance of SystemMonitor
const systemMonitor = new SystemMonitor();

// Middleware to track requests and response times
const trackRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Track the request
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    systemMonitor.recordRequest(responseTime);
    
    // Track errors (4xx and 5xx status codes)
    if (res.statusCode >= 400) {
      systemMonitor.recordError();
    }
  });
  
  next();
};

// Middleware to track errors
const trackError = (error, req, res, next) => {
  systemMonitor.recordError();
  next(error);
};

// Function to get system metrics
const getSystemMetrics = () => {
  return systemMonitor.getMetrics();
};

module.exports = {
  trackRequest,
  trackError,
  getSystemMetrics,
  systemMonitor
}; 