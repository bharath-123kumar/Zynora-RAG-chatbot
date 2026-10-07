const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { createChunksFromDocument } = require('../chunking/chunkingService');
const { generateLocalEmbedding } = require('../embeddings/embeddingService');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

/**
 * Ingests a raw document object or file path into the database, generating chunks and vector metadata.
 */
async function ingestDocument(docData) {
  logger.info(`Ingesting document: ${docData.title} (${docData.docId})`);

  // Upsert KnowledgeDocument
  const doc = await prisma.knowledgeDocument.upsert({
    where: { docId: docData.docId },
    update: {
      title: docData.title,
      category: docData.category,
      content: docData.content,
      source: docData.source,
      version: docData.version || '1.0',
      status: docData.status || 'APPROVED'
    },
    create: {
      docId: docData.docId,
      title: docData.title,
      category: docData.category,
      content: docData.content,
      source: docData.source,
      version: docData.version || '1.0',
      status: docData.status || 'APPROVED'
    }
  });

  // Remove existing chunks for this document
  await prisma.knowledgeChunk.deleteMany({
    where: { documentId: doc.id }
  });

  // Create semantic chunks
  const rawChunks = createChunksFromDocument(doc);
  const chunksToCreate = [];

  for (const chunk of rawChunks) {
    const vectorMeta = generateLocalEmbedding(chunk.content);
    chunksToCreate.push({
      documentId: doc.id,
      chunkIndex: chunk.chunkIndex,
      title: chunk.title,
      category: chunk.category,
      section: chunk.section,
      content: chunk.content,
      source: chunk.source,
      version: chunk.version,
      status: chunk.status,
      tokenCount: vectorMeta.tokenCount,
      vectorData: JSON.stringify(vectorMeta)
    });
  }

  if (chunksToCreate.length > 0) {
    await prisma.knowledgeChunk.createMany({
      data: chunksToCreate
    });
  }

  logger.info(`Document [${doc.title}] ingested successfully with ${chunksToCreate.length} chunks.`);
  return { document: doc, chunkCount: chunksToCreate.length };
}

/**
 * Scans knowledge directory and ingests all approved markdown files.
 */
async function ingestAllKnowledgeDocs(knowledgeDir = null) {
  const targetDir = knowledgeDir || path.join(__dirname, '../../../../knowledge');
  logger.info(`Starting batch document ingestion from directory: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    logger.warn(`Knowledge directory not found at: ${targetDir}`);
    return [];
  }

  const results = [];

  function scanFolder(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanFolder(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const filename = entry.name;

        // Parse doc metadata from file content or folder structure
        const categoryDir = path.basename(path.dirname(fullPath));
        const category = categoryDir.charAt(0).toUpperCase() + categoryDir.slice(1);
        
        // Extract title or doc ID from markdown header
        const titleMatch = content.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : filename;

        const docIdMatch = content.match(/Document ID:\s*([^\n]+)/i);
        const docId = docIdMatch ? docIdMatch[1].trim() : `KB-${category.toUpperCase()}-${filename.replace(/\..+$/, '')}`;

        const docData = {
          docId,
          title,
          category,
          content,
          source: `knowledge/${categoryDir}/${filename}`,
          version: '1.0',
          status: 'APPROVED'
        };

        results.push(docData);
      }
    }
  }

  scanFolder(targetDir);

  for (const docData of results) {
    await ingestDocument(docData);
  }

  logger.info(`Batch ingestion completed. Processed ${results.length} documents.`);
  return results;
}

module.exports = {
  ingestDocument,
  ingestAllKnowledgeDocs
};
