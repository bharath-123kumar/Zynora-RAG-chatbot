const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ragRoutes = require('./routes/ragRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();

// Trace ID & Request Context Middleware
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
});

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trace-id']
}));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/zynora', chatRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/chat', ragRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  let activeChunks = 0;
  try {
    activeChunks = await prisma.knowledgeChunk.count({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } }
    });
  } catch (err) {
    dbStatus = 'degraded';
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    version: '2.0.0',
    service: 'Zynora 2.0 RAG Chatbot API',
    database: dbStatus,
    activeKnowledgeChunks: activeChunks,
    timestamp: new Date().toISOString(),
    traceId: req.traceId
  });
});

// Root API Info Route
app.get('/', (req, res) => {
  res.json({
    name: 'Zynora 2.0 RAG Chatbot API',
    version: '2.0.0',
    status: 'running',
    description: 'Internal Zyngram RAG Chatbot Backend',
    endpoints: {
      health:       'GET  /health',
      auth:         'POST /api/auth/login | /api/auth/register | /api/auth/logout',
      chat:         'GET  /api/zynora/conversations | POST /api/zynora/conversations | POST /api/zynora/chat',
      rag:          'POST /api/rag/query | POST /api/rag/chat | GET /api/rag/status',
      knowledge:    'GET  /api/knowledge | POST /api/knowledge/upload',
      admin:        'GET  /api/admin/stats | /api/admin/monitoring | ...',
    },
    frontend: 'http://localhost:3000',
    docs: 'Open http://localhost:3000 in your browser to use Zynora.',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    hint: 'See GET / for available endpoints.',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
