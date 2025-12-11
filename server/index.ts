import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database/db.js';
import authRouter from './routes/auth.js';
import ingredientsRouter from './routes/ingredients.js';
import recipesRouter from './routes/recipes.js';
import shiftsRouter from './routes/shifts.js';
import salesRouter from './routes/sales.js';
import alertsRouter from './routes/alerts.js';
import reportsRouter from './routes/reports.js';
import gamificationRouter from './routes/gamification.js';
import rewardsRouter from './routes/rewards.js';
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import { scheduleWeeklyRewards, scheduleDataCleanup } from './jobs/weeklyRewards.js';
import { scheduleDatabaseBackup } from './jobs/backup.js';
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
import { logger } from './utils/logger.js';
import { migratePasswordsToBcrypt } from './database/migrate-passwords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure CORS based on environment
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production'
  ? ['https://pizza.drozast.me', 'https://www.pizza.drozast.me']
  : ['http://localhost:3000', 'http://localhost:5173']);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Make io available in routes
app.set('io', io);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // Handle React routing - return index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Initialize database
db.initialize();

// Migrate passwords to bcrypt (if not already migrated)
await migratePasswordsToBcrypt();

// Initialize cron jobs
scheduleWeeklyRewards(io);
scheduleDataCleanup();
scheduleDatabaseBackup();

const PORT = process.env.PORT || 3001;

// Error handling middleware (must be last)
app.use(errorLogger);

httpServer.listen(PORT, () => {
  logger.success(`Servidor corriendo en http://localhost:${PORT}`);
  logger.success('Base de datos inicializada');
  logger.info(`Modo: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CORS habilitado para: ${Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin}`);
});

export { io };
