/**
 * Chunking Service
 * Splits text documents into semantic chunks preserving structure and metadata.
 */

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Creates semantic chunks from document content.
 * @param {Object} doc - Document object with id, docId, title, category, version, status, content, source
 * @param {Object} options - Configurable chunkSize and overlap
 */
function createChunksFromDocument(doc, options = {}) {
  const chunkSize = options.chunkSize || 350;
  const overlap = options.overlap || 50;

  const cleanedContent = cleanText(doc.content);
  if (!cleanedContent) return [];

  // Split by markdown headings or paragraphs
  const rawSections = cleanedContent.split(/(?=\n#{1,4}\s)/);
  const chunks = [];
  let chunkIndex = 0;

  for (const rawSection of rawSections) {
    const trimmedSection = rawSection.trim();
    if (!trimmedSection) continue;

    // Detect section header if present
    const headerMatch = trimmedSection.match(/^#{1,4}\s+(.+)/);
    const sectionName = headerMatch ? headerMatch[1].trim() : (doc.category || 'General');

    // If section is short enough, keep as single chunk
    if (trimmedSection.length <= chunkSize) {
      chunks.push({
        documentId: doc.id,
        chunkIndex: chunkIndex++,
        title: doc.title,
        category: doc.category,
        section: sectionName,
        content: trimmedSection,
        source: doc.source || `KB/${doc.docId || 'DOC'}`,
        version: doc.version || '1.0',
        status: doc.status || 'DRAFT'
      });
    } else {
      // Split large section by paragraph or sliding window
      const paragraphs = trimmedSection.split(/\n\n+/);
      let currentChunkText = '';

      for (const paragraph of paragraphs) {
        if ((currentChunkText + '\n\n' + paragraph).length <= chunkSize) {
          currentChunkText = currentChunkText ? `${currentChunkText}\n\n${paragraph}` : paragraph;
        } else {
          if (currentChunkText) {
            chunks.push({
              documentId: doc.id,
              chunkIndex: chunkIndex++,
              title: doc.title,
              category: doc.category,
              section: sectionName,
              content: currentChunkText.trim(),
              source: doc.source || `KB/${doc.docId || 'DOC'}`,
              version: doc.version || '1.0',
              status: doc.status || 'DRAFT'
            });
          }

          // Handle single paragraph larger than chunkSize
          if (paragraph.length > chunkSize) {
            let start = 0;
            while (start < paragraph.length) {
              let end = start + chunkSize;
              if (end < paragraph.length) {
                // Find space break
                const lastSpace = paragraph.lastIndexOf(' ', end);
                if (lastSpace > start) end = lastSpace;
              }
              const slice = paragraph.slice(start, end).trim();
              if (slice) {
                chunks.push({
                  documentId: doc.id,
                  chunkIndex: chunkIndex++,
                  title: doc.title,
                  category: doc.category,
                  section: sectionName,
                  content: slice,
                  source: doc.source || `KB/${doc.docId || 'DOC'}`,
                  version: doc.version || '1.0',
                  status: doc.status || 'DRAFT'
                });
              }
              start = end - overlap;
              if (start < 0) start = end;
            }
            currentChunkText = '';
          } else {
            currentChunkText = paragraph;
          }
        }
      }

      if (currentChunkText.trim()) {
        chunks.push({
          documentId: doc.id,
          chunkIndex: chunkIndex++,
          title: doc.title,
          category: doc.category,
          section: sectionName,
          content: currentChunkText.trim(),
          source: doc.source || `KB/${doc.docId || 'DOC'}`,
          version: doc.version || '1.0',
          status: doc.status || 'DRAFT'
        });
      }
    }
  }

  return chunks;
}

module.exports = {
  cleanText,
  createChunksFromDocument
};
