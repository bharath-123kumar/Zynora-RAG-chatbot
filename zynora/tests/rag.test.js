const { processRAGQuery, UNKNOWN_FALLBACK_ANSWER } = require('../backend/src/services/rag/ragService');
const testCases = require('./test-questions.json');

async function runRAGTests() {
  console.log('====================================================');
  console.log('   RUNNING ZYNORA RAG RETRIEVAL & GROUNDING TESTS   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const tc of testCases) {
    const res = await processRAGQuery(tc.question, { email: 'tester@zyngram.com' });
    let isPass = false;

    if (tc.expectGrounded) {
      const containsKeywords = tc.expectedKeywords.some(kw =>
        res.answer.toLowerCase().includes(kw.toLowerCase())
      );
      isPass = res.grounded === true && res.sources.length > 0 && containsKeywords;
    } else {
      isPass = res.grounded === false && res.answer === UNKNOWN_FALLBACK_ANSWER;
    }

    if (isPass) passed++;
    else failed++;

    results.push({
      id: tc.id,
      category: tc.category,
      question: tc.question,
      grounded: res.grounded,
      sourcesCount: res.sources ? res.sources.length : 0,
      status: isPass ? 'PASS' : 'FAIL',
      answer: res.answer
    });

    console.log(`[${isPass ? 'PASS' : 'FAIL'}] ${tc.id} (${tc.category}): "${tc.question}"`);
    if (!isPass) {
      console.log(`       Got answer: "${res.answer}" (grounded: ${res.grounded})`);
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${testCases.length} tests.`);
  console.log('----------------------------------------------------\n');

  return { passed, failed, results };
}

if (require.main === module) {
  runRAGTests()
    .then(({ failed }) => process.exit(failed > 0 ? 1 : 0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runRAGTests };
