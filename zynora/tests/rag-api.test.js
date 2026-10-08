const http = require('http');
const app = require('../backend/src/app');
const { getLLMConfiguration, buildGroundedPrompt } = require('../backend/src/services/llm/llmService');

const TEST_PORT = 5099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const payload = body ? JSON.stringify(body) : null;

    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers
        }
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runRAGApiTests() {
  console.log('====================================================');
  console.log('   RUNNING DEDICATED RAG API & LLM INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(TEST_PORT, resolve));

  try {
    // Test 1: LLM Service Configuration Detection
    const llmConfig = getLLMConfiguration();
    if (typeof llmConfig.enabled === 'boolean' && typeof llmConfig.provider === 'string') {
      console.log(`[PASS] LLM Configuration resolved cleanly (Provider: ${llmConfig.provider}, Enabled: ${llmConfig.enabled})`);
      passed++;
    } else {
      console.log('[FAIL] LLM Configuration failed to initialize');
      failed++;
    }

    // Test 2: Grounded Prompt Builder
    const sampleChunks = [
      { title: 'Zyngram Franchise', section: 'Physical', content: 'Point -> Center -> Hub -> Command -> HQ' }
    ];
    const prompt = buildGroundedPrompt('What is the hierarchy?', sampleChunks);
    if (prompt.systemPrompt.includes('Zyngram') && prompt.userPrompt.includes('Point -> Center')) {
      console.log('[PASS] Grounded LLM Prompt Builder properly binds knowledge chunks');
      passed++;
    } else {
      console.log('[FAIL] Grounded LLM Prompt Builder failed');
      failed++;
    }

    // Test 3: GET /api/rag/status
    const statusRes = await request('GET', '/rag/status');
    if (statusRes.status === 200 && statusRes.data.service === 'Zynora RAG API' && statusRes.data.activeKnowledgeChunks > 0) {
      console.log(`[PASS] GET /api/rag/status returns 200 with ${statusRes.data.activeKnowledgeChunks} active chunks`);
      passed++;
    } else {
      console.log(`[FAIL] GET /api/rag/status failed with status ${statusRes.status}`);
      failed++;
    }

    // Test 4: GET /api/rag/health
    const healthRes = await request('GET', '/rag/health');
    if (healthRes.status === 200 && healthRes.data.status === 'ready') {
      console.log('[PASS] GET /api/rag/health returns 200 and ready status');
      passed++;
    } else {
      console.log(`[FAIL] GET /api/rag/health failed with status ${healthRes.status}`);
      failed++;
    }

    // Test 5: POST /api/rag/query with { query }
    const queryRes = await request('POST', '/rag/query', {
      query: 'What is the physical franchise hierarchy?'
    });
    if (queryRes.status === 200 && queryRes.data.grounded === true && queryRes.data.answer.includes('Point')) {
      console.log('[PASS] POST /api/rag/query successfully answers grounded question');
      passed++;
    } else {
      console.log(`[FAIL] POST /api/rag/query failed: ${JSON.stringify(queryRes.data)}`);
      failed++;
    }

    // Test 6: POST /api/rag/query with { message }
    const msgRes = await request('POST', '/rag/query', {
      message: "What is Zyngram's vision?"
    });
    if (msgRes.status === 200 && msgRes.data.grounded === true && msgRes.data.answer.toLowerCase().includes('vision')) {
      console.log('[PASS] POST /api/rag/query accepts message alias');
      passed++;
    } else {
      console.log(`[FAIL] POST /api/rag/query with message failed: ${JSON.stringify(msgRes.data)}`);
      failed++;
    }

    // Test 7: POST /api/rag root endpoint
    const rootRagRes = await request('POST', '/rag', {
      query: 'What is Mobile Recharge?'
    });
    if (rootRagRes.status === 200 && rootRagRes.data.grounded === true) {
      console.log('[PASS] POST /api/rag root router endpoint returns grounded response');
      passed++;
    } else {
      console.log(`[FAIL] POST /api/rag failed: ${JSON.stringify(rootRagRes.data)}`);
      failed++;
    }

    // Test 8: POST /api/chat alias route
    const chatAliasRes = await request('POST', '/chat/query', {
      query: 'What is the digital franchise hierarchy?'
    });
    if (chatAliasRes.status === 200 && chatAliasRes.data.grounded === true) {
      console.log('[PASS] POST /api/chat alias router handles direct query');
      passed++;
    } else {
      console.log(`[FAIL] POST /api/chat/query failed: ${JSON.stringify(chatAliasRes.data)}`);
      failed++;
    }

    // Test 9: Unanswerable query on /api/rag/query
    const unanswerableRes = await request('POST', '/rag/query', {
      query: 'Who won the 2022 FIFA World Cup?'
    });
    if (
      unanswerableRes.status === 200 &&
      unanswerableRes.data.grounded === false &&
      unanswerableRes.data.answer.includes("couldn't find this information")
    ) {
      console.log('[PASS] POST /api/rag/query strictly returns approved fallback for ungrounded query');
      passed++;
    } else {
      console.log(`[FAIL] POST /api/rag/query unanswerable check failed: ${JSON.stringify(unanswerableRes.data)}`);
      failed++;
    }

    // Test 10: Validation failure on invalid body
    const invalidRes = await request('POST', '/rag/query', {});
    if (invalidRes.status === 400 && invalidRes.data.error === 'Validation failed') {
      console.log('[PASS] POST /api/rag/query validates input and rejects empty body with 400');
      passed++;
    } else {
      console.log(`[FAIL] POST /api/rag/query validation test failed: status ${invalidRes.status}`);
      failed++;
    }
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log('\n----------------------------------------------------');
  console.log(`RAG API Suite: ${passed} Passed, ${failed} Failed out of 10 tests.`);
  console.log('----------------------------------------------------\n');

  return { passed, failed };
}

if (require.main === module) {
  runRAGApiTests()
    .then(({ failed }) => process.exit(failed > 0 ? 1 : 0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runRAGApiTests };
