const { processRAGQuery, UNKNOWN_FALLBACK_ANSWER, SCOPE_FALLBACK_ANSWER } = require('../backend/src/services/rag/ragService');
const testDataset = require('./test-questions-40.json');

async function runDay13Evaluation() {
  console.log('========================================================================');
  console.log('       ZYNORA DAY 13 — 40-QUESTION EVALUATION & VALIDATION SUITE        ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  let totalAnswerable = 0;
  let totalCorrect = 0;
  let totalGrounded = 0;
  let totalNoAnswer = 0;
  let totalRetrievalSuccess = 0;

  const evaluationRecords = [];

  for (const tc of testDataset) {
    const history = tc.history || [];
    const startTime = Date.now();
    const res = await processRAGQuery(tc.question, { email: 'evaluator@zyngram.com' }, null, history);
    const latency = res.latencyMs || (Date.now() - startTime);

    let isPass = false;
    let classification = 'Incorrect';
    let notes = '';

    if (tc.expectGrounded) {
      totalAnswerable++;
      const lowerAnswer = res.answer.toLowerCase();
      const matchedKeyword = tc.expectedKeywords.some(kw => lowerAnswer.includes(kw.toLowerCase()));
      const hasSources = res.sources && res.sources.length > 0;

      if (res.grounded === true && hasSources && matchedKeyword) {
        isPass = true;
        classification = 'Correct';
        totalCorrect++;
        totalGrounded++;
        totalRetrievalSuccess++;
        notes = `Matched keyword(s) with ${res.sources.length} sources.`;
      } else if (res.grounded === true && hasSources) {
        classification = 'Partially Correct';
        notes = 'Retrieved sources but missed expected keywords.';
      } else if (res.answer === UNKNOWN_FALLBACK_ANSWER) {
        classification = 'No Answer';
        notes = 'Fell back to unknown answer.';
      } else {
        classification = 'Unsupported';
        notes = 'Answer not supported by sources.';
      }
    } else {
      // Unanswerable, Ambiguous, or Prompt Injection
      const expectedFallback = tc.expectedFallback || UNKNOWN_FALLBACK_ANSWER;
      const isExpectedFallback = res.answer === expectedFallback;

      if (res.grounded === false && isExpectedFallback) {
        isPass = true;
        classification = 'No Answer';
        totalCorrect++;
        totalNoAnswer++;
        totalRetrievalSuccess++;
        notes = 'Properly adhered to knowledge boundary.';
      } else if (res.grounded === true) {
        classification = 'Hallucination';
        notes = 'Invented information or bypassed guardrails!';
      } else {
        classification = 'Incorrect';
        notes = `Got unexpected fallback: "${res.answer.substring(0, 40)}..."`;
      }
    }

    if (isPass) passed++;
    else failed++;

    const record = {
      testId: tc.id,
      category: tc.category,
      question: tc.question,
      expectedResult: tc.expectGrounded ? 'Grounded Answer' : 'Fallback / Blocked',
      actualAnswer: res.answer,
      retrievedSource: res.sources && res.sources[0] ? `${res.sources[0].title} [${res.sources[0].section || 'General'}]` : 'None',
      grounded: res.grounded,
      classification,
      status: isPass ? 'PASS' : 'FAIL',
      latencyMs: latency,
      notes
    };

    evaluationRecords.push(record);

    console.log(`[${record.status}] ${record.testId} [${record.category}] ${record.question.substring(0, 45).padEnd(45)} -> ${record.classification} (${latency}ms)`);
  }

  const accuracyPct = ((totalCorrect / testDataset.length) * 100).toFixed(2);
  const groundedPct = ((totalGrounded / testDataset.length) * 100).toFixed(2);
  const noAnswerRatePct = ((totalNoAnswer / testDataset.length) * 100).toFixed(2);
  const retrievalSuccessPct = ((totalRetrievalSuccess / testDataset.length) * 100).toFixed(2);

  console.log('\n========================================================================');
  console.log('                     DAY 13 EVALUATION METRICS REPORT                   ');
  console.log('========================================================================');
  console.log(`Total Evaluated Questions: ${testDataset.length}`);
  console.log(`Passed:                    ${passed}`);
  console.log(`Failed:                    ${failed}`);
  console.log(`Accuracy Rate:             ${accuracyPct}% (${totalCorrect}/${testDataset.length})`);
  console.log(`Grounded Answer Rate:      ${groundedPct}% (${totalGrounded}/${testDataset.length})`);
  console.log(`No-Answer Rate:            ${noAnswerRatePct}% (${totalNoAnswer}/${testDataset.length})`);
  console.log(`Retrieval Success Rate:    ${retrievalSuccessPct}% (${totalRetrievalSuccess}/${testDataset.length})`);
  console.log('========================================================================\n');

  return {
    passed,
    failed,
    total: testDataset.length,
    accuracyPct,
    groundedPct,
    noAnswerRatePct,
    retrievalSuccessPct,
    records: evaluationRecords
  };
}

if (require.main === module) {
  runDay13Evaluation()
    .then(({ failed }) => process.exit(failed > 0 ? 1 : 0))
    .catch(err => {
      console.error('Evaluation execution failed:', err);
      process.exit(1);
    });
}

module.exports = { runDay13Evaluation };
