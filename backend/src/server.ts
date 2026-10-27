import express from 'express';
import cors from 'cors';
import { config } from './config/config';
import { authRouter } from './routes/auth.routes';
import { resourceRouter } from './routes/resource.routes';
import { bookingRouter } from './routes/booking.routes';
import { errorHandler } from './middleware/errorHandler';
import { seedDatabase } from './db/seed';
import { db } from './config/database';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow frontend dev server and testing
  credentials: true
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  if (config.nodeEnv !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Root & Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Office Link API'
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/resources', resourceRouter);
app.use('/api/v1/bookings', bookingRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Endpoint ${req.method} ${req.path} does not exist.`
  });
});

// Centralized Error Handling
app.use(errorHandler);

// Auto-seed if database is brand new
const resourceCount = db.prepare('SELECT COUNT(*) as cnt FROM resources').get() as { cnt: number };
if (resourceCount.cnt === 0) {
  seedDatabase();
}

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`
===========================================================
🏢 Office Link Backend API
🚀 Server listening on http://localhost:${config.port}
🔒 Mode: ${config.nodeEnv}
⚡ Concurrency Guard: SQLite WAL + Immediate Serialized Transactions
===========================================================
    `);
  });
}

export default app;
