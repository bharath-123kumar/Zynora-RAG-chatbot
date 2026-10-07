const knowledgeService = require('../services/knowledge/knowledgeService');
const { ingestAllKnowledgeDocs } = require('../services/ingestion/ingestionService');
const logger = require('../utils/logger');

async function listDocuments(req, res, next) {
  try {
    const { category, status, search } = req.query;
    const docs = await knowledgeService.getAllDocuments({ category, status, search });
    res.json({ documents: docs });
  } catch (err) {
    next(err);
  }
}

async function getDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await knowledgeService.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (err) {
    next(err);
  }
}

async function createDocument(req, res, next) {
  try {
    const doc = await knowledgeService.createDocument(req.body, req.user);
    res.status(201).json({ message: 'Document created successfully', document: doc });
  } catch (err) {
    next(err);
  }
}

async function updateDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await knowledgeService.updateDocument(id, req.body, req.user);
    res.json({ message: 'Document updated successfully', document: doc });
  } catch (err) {
    next(err);
  }
}

async function approveDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await knowledgeService.setDocumentStatus(id, 'APPROVED', req.user);
    res.json({ message: 'Document approved successfully', document: doc });
  } catch (err) {
    next(err);
  }
}

async function activateDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await knowledgeService.setDocumentStatus(id, 'ACTIVE', req.user);
    res.json({ message: 'Document activated for RAG retrieval', document: doc });
  } catch (err) {
    next(err);
  }
}

async function archiveDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await knowledgeService.setDocumentStatus(id, 'ARCHIVED', req.user);
    res.json({ message: 'Document archived (excluded from RAG retrieval)', document: doc });
  } catch (err) {
    next(err);
  }
}

async function triggerIngestAll(req, res, next) {
  try {
    const results = await ingestAllKnowledgeDocs();
    res.json({ message: 'All knowledge documents ingested successfully', count: results.length });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  approveDocument,
  activateDocument,
  archiveDocument,
  triggerIngestAll
};
