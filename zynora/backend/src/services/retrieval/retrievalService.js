const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

/**
 * Retrieves candidate knowledge chunks from the database.
 * CRITICAL RULE: Retrieves ONLY chunks where status is APPROVED or ACTIVE.
 * Never retrieves DRAFT or ARCHIVED chunks.
 */
async function getCandidateChunks(categoryFilter = null) {
  try {
    const whereClause = {
      status: {
        in: ['APPROVED', 'ACTIVE']
      }
    };

    if (categoryFilter) {
      whereClause.category = categoryFilter;
    }

    const chunks = await prisma.knowledgeChunk.findMany({
      where: whereClause,
      select: {
        id: true,
        documentId: true,
        chunkIndex: true,
        title: true,
        category: true,
        section: true,
        content: true,
        source: true,
        version: true,
        status: true,
        vectorData: true
      }
    });

    logger.info(`Retrieved ${chunks.length} APPROVED/ACTIVE candidate chunks for search query.`);
    return chunks;
  } catch (err) {
    logger.error('Error in candidate chunk retrieval:', err);
    return [];
  }
}

module.exports = {
  getCandidateChunks
};
