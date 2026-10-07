const http = require('http');
const app = require('../backend/src/app');
const { runRAGTests } = require('./rag.test');
const { runInjectionTests } = require('./injection.test');
const { runSecurityTests } = require('./security.test');
const { runContextualRAGTests } = require('./contextual-rag.test');
const { runConversationTests } = require('./conversation.test');
const { runMonitoringTests } = require('./monitoring.test');

const TEST_PORT = 5098;
const TEST_API_URL = `http://127.0.0.1:${TEST_PORT}/api`;
const TEST_ROOT_URL = `http://127.0.0.1:${TEST_PORT}`;

process.env.TEST_API_URL = TEST_API_URL;
process.env.TEST_ROOT_URL = TEST_ROOT_URL;

async function postJson(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

async function main() {
  console.log('\n========================================================================');
  console.log('         ZYNORA 2.0 NEXT LIVE DEPLOYMENT COMPLETE TEST SUITE             ');
  console.log('========================================================================\n');

  // PHASE 1: Knowledge Security & Isolation Tests
  console.log('>>> PHASE 1: Running Knowledge Security & Isolation Tests');
  const secResult = await runSecurityTests();

  // PHASE 2: Prompt Injection Protection Tests
  console.log('>>> PHASE 2: Running Prompt Injection Protection Tests');
  const injResult = await runInjectionTests();

  // PHASE 3: 15 Standard Assessment Test Questions
  console.log('>>> PHASE 3: Running 15 Standard Assessment Test Questions');
  const ragResult = await runRAGTests();

  // PHASE 4: Context-Aware RAG Follow-up Multi-Turn Tests
  console.log('>>> PHASE 4: Running Context-Aware RAG Follow-up Multi-Turn Tests');
  const ctxResult = await runContextualRAGTests();

  // Start internal test server for HTTP testing
  console.log(`\n>>> STARTING HTTP TEST SERVER on port ${TEST_PORT}...`);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));

  let convResult = { passed: 0, failed: 0 };
  let monResult = { passed: 0, failed: 0 };

  try {
    // Authenticate Admin & Standard User
    const adminLoginData = await postJson(`${TEST_API_URL}/auth/login`, {
      email: 'admin@zyngram.com',
      password: 'AdminPass123!'
    });
    const adminToken = adminLoginData.token;
    const adminUser = adminLoginData.user;

    const userLoginData = await postJson(`${TEST_API_URL}/auth/login`, {
      email: 'user@zyngram.com',
      password: 'UserPass123!'
    });
    const userToken = userLoginData.token;
    const normalUser = userLoginData.user;

    // PHASE 5: Conversation Persistence & Cross-User Isolation Tests
    console.log('>>> PHASE 5: Running Conversation Persistence & Cross-User Access Isolation Tests');
    convResult = await runConversationTests(TEST_API_URL, userToken, adminToken, normalUser.id, adminUser.id);

    // PHASE 6: AI Monitoring Dashboard, Health & Security Tests
    console.log('>>> PHASE 6: Running AI Monitoring Dashboard, Health Check & Error Tracking Tests');
    monResult = await runMonitoringTests(TEST_API_URL, TEST_ROOT_URL, adminToken, userToken);

  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('>>> Internal test server stopped.\n');
  }

  // Summary Table of 15 Core Questions
  console.log('========================================================================');
  console.log('                     FINAL 15-QUESTION TEST REPORT                      ');
  console.log('========================================================================\n');

  console.log('| Test ID | Question | Grounded | Sources | Status |');
  console.log('|---------|----------|----------|---------|--------|');
  ragResult.results.forEach(r => {
    console.log(`| ${r.id} | ${r.question.padEnd(30).slice(0, 30)} | ${String(r.grounded).padEnd(8)} | ${String(r.sourcesCount).padEnd(7)} | ${r.status} |`);
  });

  const totalPassed =
    secResult.passed +
    injResult.passed +
    ragResult.passed +
    ctxResult.passed +
    convResult.passed +
    monResult.passed;

  const totalFailed =
    secResult.failed +
    injResult.failed +
    ragResult.failed +
    ctxResult.failed +
    convResult.failed +
    monResult.failed;

  console.log('\n========================================================================');
  console.log('                  COMPLETE SUITE EXECUTION SUMMARY                      ');
  console.log('========================================================================');
  console.log(`1. Knowledge Security & Isolation:     ${secResult.passed} Passed, ${secResult.failed} Failed`);
  console.log(`2. Prompt Injection Protection:         ${injResult.passed} Passed, ${injResult.failed} Failed`);
  console.log(`3. Standard Grounding Questions:       ${ragResult.passed} Passed, ${ragResult.failed} Failed`);
  console.log(`4. Context-Aware Follow-up RAG:         ${ctxResult.passed} Passed, ${ctxResult.failed} Failed`);
  console.log(`5. Conversation & Cross-User Isolation: ${convResult.passed} Passed, ${convResult.failed} Failed`);
  console.log(`6. AI Monitoring Dashboard & Health:    ${monResult.passed} Passed, ${monResult.failed} Failed`);
  console.log('------------------------------------------------------------------------');
  console.log(`TOTAL TEST SUITE: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('========================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
