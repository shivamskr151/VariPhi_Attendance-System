const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const employeeRoutes = require('./routes/employees');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const invitationRoutes = require('./routes/invitations');
const configRoutes = require('./routes/config');
const documentsRoutes = require('./routes/documents');
const holidaysRoutes = require('./routes/holidays');
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { trackRequest, trackError, getSystemMetrics } = require('./middleware/systemMonitor');
const socketHandler = require('./services/socketHandler');
const { emitSystemHealthUpdate } = require('./services/socketHandler');

const app = express();
const server = createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.SOCKET_CORS_ORIGIN || `http://localhost:${process.env.CLIENT_PORT || 3001}`,
      `http://localhost:${process.env.CLIENT_PORT || 3001}`,
      `http://127.0.0.1:${process.env.CLIENT_PORT || 3001}`,
      // Fallback for development
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Rate limiting (disabled for development)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for health check and development
    return req.path === '/api/health' || process.env.NODE_ENV === 'development';
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL, 
      process.env.MOBILE_URL, 
      `http://localhost:${process.env.CLIENT_PORT || 3001}`,
      `http://127.0.0.1:${process.env.CLIENT_PORT || 3001}`,
      // Fallback for development
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// System monitoring middleware
app.use(trackRequest);

// Database connection
mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URI_PROD)
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Initialize database with seed data if empty
  const { initializeDatabase } = require('./init-config');
  await initializeDatabase();
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/holidays', holidaysRoutes);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socketHandler(io, socket);
});

// Emit system health updates every 10 seconds to admin users
setInterval(() => {
  const systemMetrics = getSystemMetrics();
  emitSystemHealthUpdate(io, systemMetrics);
}, 10000);

// Error handling middleware
app.use(trackError);
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

module.exports = { app, server, io }; 