require('dotenv').config();
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
      // In development, allow localhost, emulator, and local loopbacks
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.0.2.2')) {
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

// Parse JSON with reasonable payload limit (prevent memory exhaustion attacks)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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
    error: 'NOT_FOUND'
  });
});

// Standardized Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Start Server if directly executed
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`WellWisher backend server listening on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}].`);
  });
}

module.exports = app;
