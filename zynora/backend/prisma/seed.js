const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { ingestAllKnowledgeDocs } = require('../src/services/ingestion/ingestionService');
const logger = require('../src/utils/logger');

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting Zynora database seeding...');

  // 1. Seed Users
  const adminPassword = await bcrypt.hash('AdminPass123!', 10);
  const userPassword = await bcrypt.hash('UserPass123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zyngram.com' },
    update: { password: adminPassword, role: 'ADMIN' },
    create: {
      email: 'admin@zyngram.com',
      password: adminPassword,
      name: 'Zyngram Admin',
      role: 'ADMIN'
    }
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@zyngram.com' },
    update: { password: userPassword, role: 'USER' },
    create: {
      email: 'user@zyngram.com',
      password: userPassword,
      name: 'Standard User',
      role: 'USER'
    }
  });

  logger.info(`Seeded users: Admin (${admin.email}), User (${normalUser.email})`);

  // 2. Ingest Knowledge Documents
  logger.info('Ingesting Zyngram Knowledge Base documents...');
  const ingestedDocs = await ingestAllKnowledgeDocs();

  logger.info(`Database seed completed successfully! Ingested ${ingestedDocs.length} knowledge documents.`);
}

main()
  .catch((e) => {
    logger.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
