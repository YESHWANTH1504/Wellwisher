const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { generalLimiter, authLimiter, aiLimiter } = require('./middleware/rateLimiter');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const routineRoutes = require('./routes/routineRoutes');
const screenCareRoutes = require('./routes/screenCareRoutes');
const hydrationRoutes = require('./routes/hydrationRoutes');
const sleepMoodRoutes = require('./routes/sleepMoodRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const familyRoutes = require('./routes/familyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const vitalsRoutes = require('./routes/vitalsRoutes');
const autonomousRoutes = require('./routes/autonomousRoutes');
const jarvisVoiceRoutes = require('./routes/jarvisVoiceRoutes');
const livekitRoutes = require('./routes/livekitRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const jarvisRoutes = require('./routes/jarvisRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Fail-fast security validation in production
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32)) {
  console.error('FATAL ERROR: JWT_SECRET must be at least 32 characters long in production mode.');
  process.exit(1);
}

// Environment-driven CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://10.0.2.2:3000'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);

    if (!isProd) {
      // In development, allow localhost, emulator, local loopbacks, and local network IPs (LAN)
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('10.0.2.2') ||
        /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));

// Import Middleware
const { requestCorrelationMiddleware } = require('./middleware/requestCorrelation');
const { globalErrorBoundary } = require('./middleware/globalErrorBoundary');

// Parse JSON with reasonable payload limit for multimodal inputs (max 25mb)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Attach Request Correlation ID propagation
app.use(requestCorrelationMiddleware);

// Liveness Check: verifies node event loop & process is alive
app.get(['/health/live', '/liveness'], (req, res) => {
  res.json({
    status: 'ALIVE',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Readiness Check: verifies database and core dependencies
app.get(['/health/ready', '/readiness'], async (req, res) => {
  try {
    const isDbConnected = await pool.checkConnection();
    if (!isDbConnected) {
      return res.status(503).json({
        status: 'UNREADY',
        database: 'DISCONNECTED',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
    res.json({
      status: 'READY',
      database: 'CONNECTED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (err) {
    res.status(503).json({
      status: 'UNREADY',
      error: err.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
});

// Apply General Rate Limiter to all API routes
app.use('/api', generalLimiter);

// Register API Routes with dedicated rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/schedule', routineRoutes);
app.use('/api/screen-care', screenCareRoutes);
app.use('/api/hydration', hydrationRoutes);
app.use('/api/sleep-mood', sleepMoodRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/autonomous', autonomousRoutes);
app.use('/api/jarvis/voice', aiLimiter, jarvisVoiceRoutes);
app.use('/api/jarvis/calendar', aiLimiter, calendarRoutes);
app.use('/api/jarvis', aiLimiter, jarvisRoutes);
app.use('/api/livekit', aiLimiter, livekitRoutes);

// Safe Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    res.json({
      status: 'OK',
      message: 'Backend server is healthy',
      database: 'connected',
      test_query_solution: rows[0].solution,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Health check DB error:', err.message);
    res.status(503).json({
      status: 'ERROR',
      message: 'Database service unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Default Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to WellWisher Secure API Gateway',
    version: '1.4.0',
    status: 'ACTIVE'
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.method} ${req.originalUrl}`,
    error: 'NOT_FOUND',
    requestId: req.requestId
  });
});

// Centralized Global Error Boundary Middleware
app.use(globalErrorBoundary);

// Unauthenticated Root Health Check
app.get('/health', (req, res) => {
  res.redirect(307, '/api/health');
});

// Start Server if directly executed
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WellWisher backend server listening on 0.0.0.0:${PORT} [Mode: ${process.env.NODE_ENV || 'development'}].`);
  });
}

module.exports = app;

