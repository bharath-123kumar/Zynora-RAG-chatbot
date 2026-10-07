const { tokenize, generateLocalEmbedding, cosineSimilarity } = require('../embeddings/embeddingService');
const logger = require('../../utils/logger');

const MIN_RELEVANCE_THRESHOLD = 0.32;

/**
 * Calculates a composite relevance score for a candidate chunk given a query.
 */
function scoreChunk(query, chunk) {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedContent = chunk.content.toLowerCase();
  const normalizedTitle = chunk.title.toLowerCase();
  const normalizedSection = chunk.section.toLowerCase();

  const queryEmbedding = generateLocalEmbedding(normalizedQuery);
  const queryTokens = queryEmbedding.tokens;

  if (queryTokens.length === 0) return 0;

  // 1. Exact term / phrase match score
  let exactMatchBonus = 0;
  if (normalizedContent.includes(normalizedQuery)) {
    exactMatchBonus += 0.5;
  }

  // Check key phrases in title/section
  for (const token of queryTokens) {
    if (normalizedTitle.includes(token)) exactMatchBonus += 0.15;
    if (normalizedSection.includes(token)) exactMatchBonus += 0.1;
  }

  // 2. Token overlap ratio
  let matchedTokens = 0;
  for (const token of queryTokens) {
    if (normalizedContent.includes(token)) {
      matchedTokens++;
    }
  }
  const tokenOverlapRatio = matchedTokens / queryTokens.length;

  // If more than half the query tokens are missing, heavily penalize false matches
  if (queryTokens.length >= 2 && tokenOverlapRatio < 0.6) {
    return 0;
  }

  // 3. Cosine similarity from term vector metadata
  let chunkTfVector = {};
  try {
    const vectorMeta = JSON.parse(chunk.vectorData || '{}');
    chunkTfVector = vectorMeta.tf || {};
  } catch (e) {
    const fallbackEmbedding = generateLocalEmbedding(normalizedContent);
    chunkTfVector = fallbackEmbedding.tf;
  }

  const cosineSim = cosineSimilarity(queryEmbedding.tf, chunkTfVector);

  // Composite score calculation
  const compositeScore = (exactMatchBonus * 0.35) + (tokenOverlapRatio * 0.45) + (cosineSim * 0.20);
  return compositeScore;
}

/**
 * Ranks candidate chunks and filters out any chunk scoring below the relevance threshold.
 */
function rankCandidateChunks(query, candidateChunks, threshold = MIN_RELEVANCE_THRESHOLD) {
  const scoredChunks = candidateChunks.map(chunk => {
    const score = scoreChunk(query, chunk);
    return {
      ...chunk,
      score
    };
  });

  // Sort descending by score
  scoredChunks.sort((a, b) => b.score - a.score);

  // Filter chunks meeting minimum threshold
  const topChunks = scoredChunks.filter(c => c.score >= threshold);

  logger.info(`Ranking complete for query "${query}". Total candidates: ${candidateChunks.length}, Above threshold (${threshold}): ${topChunks.length}`);
  if (topChunks.length > 0) {
    logger.info(`Top chunk score: ${topChunks[0].score.toFixed(4)} - ${topChunks[0].title} [${topChunks[0].section}]`);
  }

  return topChunks;
}

module.exports = {
  scoreChunk,
  rankCandidateChunks,
  MIN_RELEVANCE_THRESHOLD
};
