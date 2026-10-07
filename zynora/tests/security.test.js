const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const { getCandidateChunks } = require('../backend/src/services/retrieval/retrievalService');
const { ingestDocument } = require('../backend/src/services/ingestion/ingestionService');

const prisma = new PrismaClient();

async function runSecurityTests() {
  console.log('====================================================');
  console.log('   RUNNING KNOWLEDGE SECURITY & ISOLATION TESTS     ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Ingest an ARCHIVED document and verify retrieval excludes it
    await ingestDocument({
      docId: 'KB-TEST-ARCHIVED',
      title: 'Top Secret Archived Architecture',
      category: 'Company',
      content: 'This is an archived document that must NEVER be retrieved by Zynora.',
      source: 'test/archived.md',
      version: '1.0',
      status: 'ARCHIVED'
    });

    // Test 2: Ingest a DRAFT document and verify retrieval excludes it
    await ingestDocument({
      docId: 'KB-TEST-DRAFT',
      title: 'Draft Unapproved Feature Spec',
      category: 'Services',
      content: 'This is a draft document that has not been approved.',
      source: 'test/draft.md',
      version: '1.0',
      status: 'DRAFT'
    });

    const candidates = await getCandidateChunks();
    const hasArchived = candidates.some(c => c.status === 'ARCHIVED' || c.title.includes('Archived'));
    const hasDraft = candidates.some(c => c.status === 'DRAFT' || c.title.includes('Draft'));

    if (!hasArchived) {
      passed++;
      console.log('[PASS] ARCHIVED content is strictly excluded from candidate retrieval.');
    } else {
      failed++;
      console.log('[FAIL] Security breach: ARCHIVED content was retrieved!');
    }

    if (!hasDraft) {
      passed++;
      console.log('[PASS] DRAFT content is strictly excluded from candidate retrieval.');
    } else {
      failed++;
      console.log('[FAIL] Security breach: DRAFT content was retrieved!');
    }

    // Clean up test documents
    await prisma.knowledgeDocument.deleteMany({
      where: { docId: { in: ['KB-TEST-ARCHIVED', 'KB-TEST-DRAFT'] } }
    });
  } catch (err) {
    console.error('Error running security tests:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n----------------------------------------------------');
  console.log(`Security Tests: ${passed} Passed, ${failed} Failed.`);
  console.log('----------------------------------------------------\n');

  return { passed, failed };
}

if (require.main === module) {
  runSecurityTests()
    .then(({ failed }) => process.exit(failed > 0 ? 1 : 0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runSecurityTests };
