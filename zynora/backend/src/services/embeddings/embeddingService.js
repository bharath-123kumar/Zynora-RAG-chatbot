/**
 * Local Vector and Embedding Service
 * Uses TF-IDF, N-gram extraction, and Cosine Similarity.
 * Completely local with zero external AI API dependency.
 */

// Common English stopwords to ignore in term frequency calculations
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
  'can', 'will', 'just', 'don', 'should', 'now', 'this', 'that', 'these', 'those',
  'what', 'which', 'who', 'whom', 'it', 'its', 'of', 'i', 'me', 'my', 'myself'
]);

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function getTermFrequencies(tokens) {
  const tf = {};
  const total = tokens.length || 1;
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  // Normalize term frequency
  for (const token in tf) {
    tf[token] = tf[token] / total;
  }
  return tf;
}

function extractNGrams(text, n = 2) {
  const tokens = tokenize(text);
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function generateLocalEmbedding(text) {
  const tokens = tokenize(text);
  const tf = getTermFrequencies(tokens);
  const bigrams = extractNGrams(text, 2);
  const trigrams = extractNGrams(text, 3);

  return {
    tf,
    tokens,
    bigrams,
    trigrams,
    tokenCount: tokens.length
  };
}

function cosineSimilarity(tfVector1, tfVector2) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...Object.keys(tfVector1), ...Object.keys(tfVector2)]);

  for (const key of allKeys) {
    const valA = tfVector1[key] || 0;
    const valB = tfVector2[key] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  tokenize,
  getTermFrequencies,
  extractNGrams,
  generateLocalEmbedding,
  cosineSimilarity,
  STOP_WORDS
};
