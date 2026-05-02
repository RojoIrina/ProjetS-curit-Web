// ================================================================
// EXPRESS SERVER — Entry point
// Mounts all routes, middleware, and starts the server
// ================================================================
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { generalLimiter } from './middleware/rate.limiter.js';
import { errorHandler } from './middleware/error.handler.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import moduleRoutes from './routes/module.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import verifyRoutes from './routes/verify.routes.js';

const app = express();

// ─── Security Headers ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// ─── CORS ───
const allowedOrigins = env.CORS_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.CORS_ORIGIN === '*' || env.CORS_ORIGIN === 'true') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Required for HttpOnly cookies
}));

// ─── Cookie Parser (for HttpOnly refresh token) ───
app.use(cookieParser());

// ─── Rate Limiting ───
app.use(generalLimiter);

// ─── Body Parsing ───
app.use(express.json({ limit: '1mb' }));

// ─── Health Check ───
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verify', verifyRoutes);

// ─── 404 Handler ───
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route introuvable' });
});

// ─── Global Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
app.listen(env.PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────┐
  │         🛡️  CertiVerify API Server          │
  ├─────────────────────────────────────────────┤
  │  Port:    ${String(env.PORT).padEnd(33)}│
  │  Env:     ${env.NODE_ENV.padEnd(33)}│
  │  CORS:    ${env.CORS_ORIGIN.padEnd(33)}│
  └─────────────────────────────────────────────┘
  `);
});

export default app;

