import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './src/routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Configured frontend development and production origins
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://matrixstudio-frontend.onrender.com'
];

const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const allowedOrigins = [...defaultOrigins, ...envOrigins];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like ESP32 HTTPClient or cURL/mobile apps)
    if (!origin) return callback(null, true);

    // Check if origin matches configured allowed origins, wildcard, or onrender.com domains
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.endsWith('.onrender.com') ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

app.use(cors(corsOptions));

// Support larger JSON payloads for 300-pixel RGB arrays
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // Avoid spamming logs with frequent ESP32 poll requests unless non-200
    if (req.originalUrl === '/api/device/poll' && res.statusCode === 200) {
      return;
    }
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Root welcome & API info
app.get('/', (req, res) => {
  res.json({
    name: 'Matrix Studio API Server',
    version: '1.0.0',
    description: 'REST API backend for 30x10 WS2812 LED Matrix and ESP32 controller',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      commands: {
        create: 'POST /api/commands',
        current: 'GET /api/commands/current',
        clear: 'POST /api/commands/clear'
      },
      device: {
        poll: 'GET /api/device/poll',
        ack: 'POST /api/device/ack',
        reportStatus: 'POST /api/device/status',
        getStatus: 'GET /api/device/status'
      }
    }
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`🚀 Matrix Studio Backend running at http://${HOST}:${PORT}`);
  console.log(`📡 Localhost URL:      http://localhost:${PORT}`);
  console.log(`🌐 Allowed Frontend:   ${allowedOrigins.join(', ')}`);
  console.log(`⚡ ESP32 Polling URL:  http://<YOUR_LAN_IP>:${PORT}/api/device/poll`);
  console.log('====================================================');
});
