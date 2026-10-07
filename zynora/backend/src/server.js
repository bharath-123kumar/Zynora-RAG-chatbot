const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`==================================================`);
  logger.info(`  ZYNORA RAG CHATBOT BACKEND SERVER RUNNING       `);
  logger.info(`  Port: ${PORT}                                   `);
  logger.info(`  Environment: ${process.env.NODE_ENV || 'development'} `);
  logger.info(`  Health Check: http://localhost:${PORT}/health   `);
  logger.info(`==================================================`);
});
