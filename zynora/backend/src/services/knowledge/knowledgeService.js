const { PrismaClient } = require('@prisma/client');
const { ingestDocument } = require('../ingestion/ingestionService');
const { logAuditEvent } = require('../../utils/auditLogger');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

async function getAllDocuments({ category, status, search }) {
  const where = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { docId: { contains: search } },
      { content: { contains: search } }
    ];
  }

  return await prisma.knowledgeDocument.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { chunks: true } }
    }
  });
}

async function getDocumentById(id) {
  return await prisma.knowledgeDocument.findUnique({
    where: { id },
    include: { chunks: true }
  });
}

async function createDocument(data, adminUser) {
  const docId = data.docId || `KB-${(data.category || 'GEN').toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const docData = {
    docId,
    title: data.title,
    category: data.category || 'General',
    content: data.content,
    source: data.source || `Admin/Panel/${docId}`,
    version: '1.0',
    status: data.status || 'DRAFT'
  };

  const result = await ingestDocument(docData);

  await logAuditEvent({
    userId: adminUser?.id,
    userEmail: adminUser?.email,
    action: 'KNOWLEDGE_DOCUMENT_CREATED',
    resource: `DOCUMENT:${result.document.id}`,
    metadata: { docId: result.document.docId, title: result.document.title, version: result.document.version }
  });

  return result.document;
}

async function updateDocument(id, data, adminUser) {
  const existingDoc = await prisma.knowledgeDocument.findUnique({ where: { id } });
  if (!existingDoc) throw new Error('Document not found');

  // Increment version string (e.g. 1.0 -> 1.1)
  const currentVer = parseFloat(existingDoc.version) || 1.0;
  const newVer = (currentVer + 0.1).toFixed(1);

  const docData = {
    docId: existingDoc.docId,
    title: data.title || existingDoc.title,
    category: data.category || existingDoc.category,
    content: data.content || existingDoc.content,
    source: data.source || existingDoc.source,
    version: newVer,
    status: data.status || existingDoc.status
  };

  const result = await ingestDocument(docData);

  await logAuditEvent({
    userId: adminUser?.id,
    userEmail: adminUser?.email,
    action: 'KNOWLEDGE_DOCUMENT_UPDATED',
    resource: `DOCUMENT:${id}`,
    metadata: { docId: existingDoc.docId, newVersion: newVer }
  });

  return result.document;
}

async function setDocumentStatus(id, newStatus, adminUser) {
  const doc = await prisma.knowledgeDocument.update({
    where: { id },
    data: { status: newStatus }
  });

  // Cascade status update to all associated chunks
  await prisma.knowledgeChunk.updateMany({
    where: { documentId: id },
    data: { status: newStatus }
  });

  await logAuditEvent({
    userId: adminUser?.id,
    userEmail: adminUser?.email,
    action: `KNOWLEDGE_DOCUMENT_${newStatus}`,
    resource: `DOCUMENT:${id}`,
    metadata: { docId: doc.docId, status: newStatus }
  });

  logger.info(`Document [${doc.title}] status updated to [${newStatus}].`);
  return doc;
}

module.exports = {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  setDocumentStatus
};
