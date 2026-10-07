const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

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

async function runConversationTests(baseUrl, tokenUserA, tokenUserB, userAId, userBId) {
  const BASE_URL = baseUrl || process.env.TEST_API_URL || 'http://localhost:5000/api';
  console.log('\n====================================================');
  console.log('   RUNNING CONVERSATION & PERSISTENCE TESTS         ');
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

  let testConvId = null;

  try {
    // 1. Create New Conversation
    const createRes = await request(`${BASE_URL}/zynora/conversations`, {
      method: 'POST',
      body: { title: 'Test Franchise Query' },
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    assert(createRes.status === 201 && createRes.data?.conversation?.id, 'Create Conversation returns 201 with conversationId');
    testConvId = createRes.data?.conversation?.id;

    // 2. Persistent Message Save via Chat API
    const chatRes1 = await request(`${BASE_URL}/zynora/chat`, {
      method: 'POST',
      body: {
        message: 'What is the physical franchise hierarchy?',
        conversationId: testConvId
      },
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    assert(
      chatRes1.status === 200 && chatRes1.data?.grounded === true && chatRes1.data?.sources?.length > 0,
      'Chat query executed with conversationId and grounded response'
    );

    // 3. Retrieve Conversation History
    const getRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    assert(
      getRes.status === 200 &&
      getRes.data?.conversation?.messages?.length >= 2,
      'Retrieved conversation contains persisted user and assistant messages'
    );

    // 4. Verify Message attributes (sources, latency, confidence)
    const assistantMsg = getRes.data?.conversation?.messages?.find(m => m.role === 'assistant');
    assert(
      assistantMsg && assistantMsg.grounded && assistantMsg.confidence !== 'NONE' && assistantMsg.sources?.length > 0,
      'Persisted assistant message includes grounded flag, sources, and confidence'
    );

    // 5. Rename Conversation
    const renameRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'PATCH',
      body: { title: 'Updated Franchise Structure Discussion' },
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    assert(
      renameRes.status === 200 && renameRes.data?.conversation?.title === 'Updated Franchise Structure Discussion',
      'Rename conversation successfully updates title'
    );

    // 6. Cross-User Access Isolation Test (User B attempts to read User A's conversation)
    const crossReadRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenUserB}` }
    });
    assert(crossReadRes.status === 403, 'Cross-user isolation: User B cannot access User A conversation (HTTP 403)');

    // 7. Cross-User Rename Attempt Blocked
    const crossRenameRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'PATCH',
      body: { title: 'Hacked Title' },
      headers: { Authorization: `Bearer ${tokenUserB}` }
    });
    assert(crossRenameRes.status === 403, 'Cross-user isolation: User B cannot rename User A conversation (HTTP 403)');

    // 8. Cross-User Delete Attempt Blocked
    const crossDeleteRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenUserB}` }
    });
    assert(crossDeleteRes.status === 403, 'Cross-user isolation: User B cannot delete User A conversation (HTTP 403)');

    // 9. Clear Conversation Messages
    const clearRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    const getClearedRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    assert(
      clearRes.status === 200 && getClearedRes.data?.conversation?.messages?.length === 0,
      'Clear conversation removes all messages from conversation'
    );

    // 10. Delete Conversation
    const deleteRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    assert(deleteRes.status === 200, 'Delete conversation successfully removes conversation');

    // Verify deleted conversation returns 404
    const getDeletedRes = await request(`${BASE_URL}/zynora/conversations/${testConvId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenUserA}` }
    });
    assert(getDeletedRes.status === 404, 'Deleted conversation returns 404 Not Found');

  } catch (error) {
    console.error('Unexpected error in conversation tests:', error.message);
    failed++;
  }

  console.log(`\nConversation Suite: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

module.exports = { runConversationTests };
