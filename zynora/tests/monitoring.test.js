const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';
const ROOT_URL = process.env.TEST_ROOT_URL || 'http://localhost:5000';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runMonitoringTests(baseUrl, rootUrl, adminToken, userToken) {
  const BASE_URL = baseUrl || process.env.TEST_API_URL || 'http://localhost:5000/api';
  const ROOT_URL = rootUrl || process.env.TEST_ROOT_URL || 'http://localhost:5000';

  console.log('\n====================================================');
  console.log('   RUNNING MONITORING, HEALTH & SECURITY TESTS      ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check endpoint
    const healthRes = await request(`${ROOT_URL}/health`);
    assert(
      healthRes.status === 200 &&
      healthRes.data?.status === 'ok' &&
      healthRes.data?.version === '2.0.0' &&
      healthRes.headers.get('x-trace-id') !== null,
      'System /health returns 200 OK with version 2.0.0 and x-trace-id header'
    );

    // 2. Monitoring Overview API (Admin)
    const overviewRes = await request(
      `${BASE_URL}/admin/monitoring/overview`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      overviewRes.status === 200 &&
      overviewRes.data?.overview?.totalQuestions !== undefined &&
      overviewRes.data?.overview?.successfulAnswers !== undefined &&
      overviewRes.data?.overview?.aiServiceHealth?.status === 'HEALTHY',
      'GET /api/admin/monitoring/overview returns real system KPIs and HEALTHY status'
    );

    // 3. Date Filtering on Monitoring Overview
    const today = new Date().toISOString().split('T')[0];
    const filteredRes = await request(
      `${BASE_URL}/admin/monitoring/overview?startDate=${today}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      filteredRes.status === 200 && filteredRes.data?.overview !== undefined,
      'GET /api/admin/monitoring/overview supports date filtering parameters'
    );

    // 4. Monitoring Questions API
    const questionsRes = await request(
      `${BASE_URL}/admin/monitoring/questions`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      questionsRes.status === 200 && Array.isArray(questionsRes.data?.questions),
      'GET /api/admin/monitoring/questions returns real evaluation records'
    );

    // 5. Monitoring Errors API
    const errorsRes = await request(
      `${BASE_URL}/admin/monitoring/errors`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      errorsRes.status === 200 && Array.isArray(errorsRes.data?.errors),
      'GET /api/admin/monitoring/errors returns error tracking log array'
    );

    // 6. Monitoring AI Service Health API
    const aiHealthRes = await request(
      `${BASE_URL}/admin/monitoring/health`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      aiHealthRes.status === 200 &&
      aiHealthRes.data?.health?.database === 'CONNECTED' &&
      aiHealthRes.data?.health?.ragRules?.externalAPIsDisabled === true,
      'GET /api/admin/monitoring/health confirms local RAG isolation and DB connection'
    );

    // 7. Security: Invalid JWT Token returns 401 Unauthorized
    const invalidTokenRes = await request(
      `${BASE_URL}/admin/monitoring/overview`,
      { headers: { Authorization: 'Bearer invalid.or.expired.jwt.token' } }
    );
    assert(invalidTokenRes.status === 401, 'Security: Invalid/malformed JWT token rejected with HTTP 401');

    // 8. Security: Non-Admin Access to Admin Endpoints returns 403 Forbidden
    const rbacRes = await request(
      `${BASE_URL}/admin/monitoring/overview`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(rbacRes.status === 403, 'Security: Standard USER role blocked from Admin Monitoring (HTTP 403)');

    // 9. Custom Trace ID propagation test
    const customTraceId = 'test-trace-uuid-12345';
    const traceRes = await request(`${ROOT_URL}/health`, {
      headers: { 'x-trace-id': customTraceId }
    });
    assert(
      traceRes.headers.get('x-trace-id') === customTraceId,
      'Trace ID header x-trace-id propagated correctly through middleware'
    );

  } catch (error) {
    console.error('Unexpected error in monitoring tests:', error.message);
    failed++;
  }

  console.log(`\nMonitoring Suite: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

module.exports = { runMonitoringTests };
