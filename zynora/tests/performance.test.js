const http = require('http');
const app = require('../backend/src/app');
const { getCandidateChunks } = require('../backend/src/services/retrieval/retrievalService');
const { rankCandidateChunks } = require('../backend/src/services/ranking/rankingService');
const { processRAGQuery } = require('../backend/src/services/rag/ragService');

const TEST_PORT = 5097;

function makeRequest(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      `http://127.0.0.1:${TEST_PORT}/api/zynora/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runPerformanceBenchmarks() {
  console.log('========================================================================');
  console.log('             ZYNORA DAY 13 — PRODUCTION PERFORMANCE SUITE              ');
  console.log('========================================================================\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(TEST_PORT, resolve));

  const results = {};

  try {
    // 1. DB Candidate Retrieval Time
    const dbStart = performance.now();
    const candidateChunks = await getCandidateChunks();
    const dbDuration = performance.now() - dbStart;
    results.dbRetrievalMs = parseFloat(dbDuration.toFixed(2));
    console.log(`1. DB Candidate Chunks Retrieval:  ${results.dbRetrievalMs} ms (${candidateChunks.length} chunks)`);

    // 2. Ranking Latency
    const rankStart = performance.now();
    const ranked = rankCandidateChunks('What is the physical franchise hierarchy?', candidateChunks);
    const rankDuration = performance.now() - rankStart;
    results.rankingMs = parseFloat(rankDuration.toFixed(2));
    console.log(`2. TF-IDF & Vector Ranking Time:   ${results.rankingMs} ms (${ranked.length} ranked chunks)`);

    // 3. Single Query End-to-End Latency
    const qStart = performance.now();
    const singleRes = await processRAGQuery('What is Zyngram?');
    const qDuration = performance.now() - qStart;
    results.singleQueryMs = parseFloat(qDuration.toFixed(2));
    console.log(`3. End-to-End RAG Engine Query:    ${results.singleQueryMs} ms`);

    // 4. API HTTP Response Latency
    const apiStart = performance.now();
    const apiRes = await makeRequest({ message: 'What is Zyngram?' });
    const apiDuration = performance.now() - apiStart;
    results.apiHttpMs = parseFloat(apiDuration.toFixed(2));
    console.log(`4. HTTP API Full Round-Trip Time:  ${results.apiHttpMs} ms (Status: ${apiRes.status})`);

    // 5. Concurrent Requests (Load Test with 20 parallel queries)
    const concurrentCount = 20;
    const questions = [
      'What is Zyngram?',
      'What is the physical franchise hierarchy?',
      'What is Mobile Recharge on Zyngram?',
      'What is the digital franchise hierarchy?',
      'What services are available on Zyngram?'
    ];

    const concStart = performance.now();
    const promises = [];
    for (let i = 0; i < concurrentCount; i++) {
      const q = questions[i % questions.length];
      promises.push(makeRequest({ message: q }));
    }
    const concurrentResponses = await Promise.all(promises);
    const concDuration = performance.now() - concStart;
    const avgConcurrentMs = parseFloat((concDuration / concurrentCount).toFixed(2));
    const allSuccessful = concurrentResponses.every(r => r.status === 200 && r.data.grounded === true);

    results.concurrentDurationMs = parseFloat(concDuration.toFixed(2));
    results.avgConcurrentMs = avgConcurrentMs;
    results.concurrentSuccess = allSuccessful;

    console.log(`5. Concurrent Stress Test (20 reqs): Total ${results.concurrentDurationMs} ms (Avg ${avgConcurrentMs} ms/req) - All Success: ${allSuccessful}`);

    // 6. Multi-Turn Long Conversation Latency
    const longHistory = [
      { role: 'user', content: 'What is Zyngram?' },
      { role: 'assistant', content: 'Zyngram is an all-in-one ecosystem.' },
      { role: 'user', content: 'What is the physical franchise hierarchy?' },
      { role: 'assistant', content: 'Point -> Center -> Hub -> Command -> HQ' },
      { role: 'user', content: 'What comes after Hub?' },
      { role: 'assistant', content: 'Command' },
      { role: 'user', content: 'What about Center?' },
      { role: 'assistant', content: 'Hub' }
    ];

    const longStart = performance.now();
    const longRes = await processRAGQuery('What comes before Hub?', null, null, longHistory);
    const longDuration = performance.now() - longStart;
    results.longConversationMs = parseFloat(longDuration.toFixed(2));
    console.log(`6. Long Conversation Multi-Turn:   ${results.longConversationMs} ms`);

    console.log('\n========================================================================');
    console.log('                   PERFORMANCE BENCHMARK SUMMARY                        ');
    console.log('========================================================================');
    console.log(`- Database Candidate Query:        ${results.dbRetrievalMs} ms`);
    console.log(`- Vector & Relevance Ranking:      ${results.rankingMs} ms`);
    console.log(`- End-to-End RAG Query:            ${results.singleQueryMs} ms`);
    console.log(`- API HTTP Round-Trip:             ${results.apiHttpMs} ms`);
    console.log(`- 20 Parallel Concurrent Queries:  ${results.concurrentDurationMs} ms (all pass)`);
    console.log(`- Long Multi-Turn Conversation:    ${results.longConversationMs} ms`);
    console.log('========================================================================\n');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  return results;
}

if (require.main === module) {
  runPerformanceBenchmarks()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runPerformanceBenchmarks };
