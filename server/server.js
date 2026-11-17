const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Enforce strong JWT secret configuration at startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 16) {
  console.error('[FATAL] JWT_SECRET environment variable is missing or insufficiently secure. Application startup aborted.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const schedulerService = require('./services/schedulerService');
const backupService = require('./services/backupService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const guardRoutes = require('./routes/guardRoutes');
const siteRoutes = require('./routes/siteRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const callRoutes = require('./routes/callRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const companyRoutes = require('./routes/companyRoutes');

const app = express();

// Express Trust Proxy configuration for reverse proxies (Nginx / Caddy / Cloudflare / ALB)
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  app.set('trust proxy', tp === 'true' ? 1 : (isNaN(tp) ? tp : parseInt(tp, 10)));
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Environment-Based CORS Configuration
const allowedOrigins = (() => {
  const configured = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN;
  if (configured) {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  // Default development origins
  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
    ];
  }
  // In production with no configured origins, fail closed
  return [];
})();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, curl, Postman, mobile) or same-origin without Origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development mode, dynamically permit localhost or 127.0.0.1 on any port
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }
    }

    const err = new Error(`CORS Error: Origin '${origin}' is not authorized by access policy.`);
    err.status = 403;
    return callback(err);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'x-company-id',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours preflight cache
};

app.use(cors(corsOptions));

// Security & Transport Headers
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS - Applied in production when traffic is confirmed secure
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if ((process.env.ENABLE_HSTS === 'true' || process.env.NODE_ENV === 'production') && isSecure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'GUARDCONNECT Smart Shift Monitoring & Attendance Management System',
    timestamp: new Date().toISOString(),
    timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/guards', guardRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/company', companyRoutes);

// Serve static frontend in production if built
if (process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT === 'true') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Global 404 handler for API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on GuardConnect server.`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS Error:')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }
  console.error('[Unhandled Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Connect to Database and start Server
async function startServer() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🛡️  GUARDCONNECT ENTERPRISE BACKEND SERVICE IS ACTIVE`);
    console.log(`📍 Port: ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Timezone: ${process.env.TIMEZONE || 'Asia/Kolkata'}`);
    console.log(`📞 Automated Shift Call Scheduler: Initialized`);
    if (process.env.ENABLE_DAILY_BACKUP === 'true') {
      console.log(`💾 Automated Daily MongoDB Backup: Active (02:00 AM)`);
    }
    console.log(`=======================================================`);
  });

  // Start shift call scheduler
  schedulerService.start();

  // Start automated daily backup scheduler if enabled
  if (process.env.ENABLE_DAILY_BACKUP === 'true') {
    backupService.schedule();
  }

  // Graceful shutdown handling
  const handleShutdown = () => {
    console.log('Shutdown signal received. Shutting down gracefully...');
    schedulerService.stop();
    backupService.stop();
    server.close(() => {
      console.log('Process terminated.');
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer();
