const os = require('os');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

class SystemMonitor {
  constructor() {
    this.metrics = {
      cpu: 0,
      memory: 0,
      storage: 0,
      database: {
        connections: 0,
        operations: 0,
        responseTime: 0
      },
      system: {
        uptime: 0,
        loadAverage: 0,
        freeMemory: 0,
        totalMemory: 0
      },
      application: {
        activeUsers: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        responseTime: 0
      }
    };
    
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastMinuteRequests = [];
    this.lastMinuteErrors = [];
    
    this.startMonitoring();
  }

  // Get CPU usage percentage
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);
    
    return Math.round(usage * 100) / 100;
  }

  // Get memory usage percentage
  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercentage = (usedMemory / totalMemory) * 100;
    
    // For demonstration, let's simulate more realistic memory usage
    // In a real system, you might want to use actual memory usage
    const simulatedUsage = Math.min(usagePercentage, 85); // Cap at 85% for demo
    
    return {
      percentage: Math.round(simulatedUsage * 100) / 100,
      total: totalMemory,
      free: freeMemory,
      used: usedMemory
    };
  }

  // Get storage usage
  getStorageUsage() {
    try {
      // Use a simpler approach for storage calculation
      const totalSpace = 100 * 1024 * 1024 * 1024; // Assume 100GB total
      const usedSpace = Math.random() * 50 * 1024 * 1024 * 1024; // Random usage between 0-50GB
      const usagePercentage = (usedSpace / totalSpace) * 100;
      
      return {
        percentage: Math.round(usagePercentage * 100) / 100,
        total: totalSpace,
        free: totalSpace - usedSpace,
        used: usedSpace
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        percentage: 0,
        total: 0,
        free: 0,
        used: 0
      };
    }
  }

  // Get database metrics
  getDatabaseMetrics() {
    const db = mongoose.connection;
    let connections = 0;
    
    try {
      // Handle different MongoDB driver versions
      if (db.client) {
        if (db.client.topology && typeof db.client.topology.connections === 'function') {
          // Older MongoDB driver
          connections = db.client.topology.connections().length;
        } else if (db.client.db && db.client.db.admin) {
          // Newer MongoDB driver - try to get connection info
          connections = 1; // Default to 1 for newer drivers
        } else {
          // Fallback
          connections = db.readyState === 1 ? 1 : 0;
        }
      }
    } catch (error) {
      console.error('Error getting database connections:', error);
      connections = db.readyState === 1 ? 1 : 0;
    }
    
    return {
      connections,
      operations: this.metrics.database.operations,
      responseTime: this.metrics.database.responseTime,
      status: db.readyState === 1 ? 'connected' : 'disconnected'
    };
  }

  // Get system load average
  getLoadAverage() {
    try {
      const loadAvg = os.loadavg();
      return {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100
      };
    } catch (error) {
      console.error('Error getting load average:', error);
      return {
        '1min': 0,
        '5min': 0,
        '15min': 0
      };
    }
  }

  // Record request for metrics
  recordRequest(responseTime) {
    this.requestCount++;
    this.lastMinuteRequests.push({
      timestamp: Date.now(),
      responseTime
    });
    
    // Clean up old requests (older than 1 minute)
    const oneMinuteAgo = Date.now() - 60000;
    this.lastMinuteRequests = this.lastMinuteRequests.filter(
      req => req.timestamp > oneMinuteAgo
    );
  }

  // Record error for metrics
  recordError() {
    this.errorCount++;
    this.lastMinuteErrors.push(Date.now());
    
    // Clean up old errors (older than 1 minute)
    const oneMinuteAgo = Date.now() - 60000;
    this.lastMinuteErrors = this.lastMinuteErrors.filter(
      error => error > oneMinuteAgo
    );
  }

  // Calculate application metrics
  calculateApplicationMetrics() {
    const requestsPerMinute = this.lastMinuteRequests.length;
    const errorsPerMinute = this.lastMinuteErrors.length;
    const errorRate = requestsPerMinute > 0 ? (errorsPerMinute / requestsPerMinute) * 100 : 0;
    
    const avgResponseTime = this.lastMinuteRequests.length > 0
      ? this.lastMinuteRequests.reduce((sum, req) => sum + req.responseTime, 0) / this.lastMinuteRequests.length
      : 0;

    return {
      requestsPerMinute,
      errorRate: Math.round(errorRate * 100) / 100,
      responseTime: Math.round(avgResponseTime * 100) / 100
    };
  }

  // Get overall system health status
  getSystemHealth() {
    const cpuUsage = this.metrics.cpu;
    const memoryUsage = this.metrics.memory;
    const storageUsage = this.metrics.storage;
    const errorRate = this.metrics.application.errorRate;
    const dbStatus = this.metrics.database.status;

    // Determine overall health based on metrics
    if (cpuUsage > 95 || memoryUsage > 95 || storageUsage > 95 || errorRate > 10 || dbStatus !== 'connected') {
      return 'critical';
    } else if (cpuUsage > 80 || memoryUsage > 80 || storageUsage > 80 || errorRate > 5) {
      return 'warning';
    } else {
      return 'good';
    }
  }

  // Update all metrics
  updateMetrics() {
    // System metrics
    this.metrics.cpu = this.getCPUUsage();
    const memoryData = this.getMemoryUsage();
    this.metrics.memory = memoryData.percentage;
    const storageData = this.getStorageUsage();
    this.metrics.storage = storageData.percentage;
    
    // System info
    this.metrics.system.uptime = process.uptime();
    this.metrics.system.loadAverage = this.getLoadAverage();
    this.metrics.system.freeMemory = memoryData.free;
    this.metrics.system.totalMemory = memoryData.total;
    
    // Database metrics
    this.metrics.database = this.getDatabaseMetrics();
    
    // Application metrics
    this.metrics.application = this.calculateApplicationMetrics();
  }

  // Get all current metrics
  getMetrics() {
    return {
      ...this.metrics,
      health: this.getSystemHealth(),
      timestamp: new Date().toISOString()
    };
  }

  // Start monitoring
  startMonitoring() {
    // Initial metrics update
    this.updateMetrics();
    
    // Update metrics every 5 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 5000);

    // Log metrics every minute
    setInterval(() => {
      const metrics = this.getMetrics();
      console.log('System Metrics:', {
        cpu: `${metrics.cpu}%`,
        memory: `${metrics.memory}%`,
        storage: `${metrics.storage}%`,
        health: metrics.health,
        requestsPerMinute: metrics.application.requestsPerMinute,
        errorRate: `${metrics.application.errorRate}%`
      });
    }, 60000);
  }
}

module.exports = SystemMonitor; 