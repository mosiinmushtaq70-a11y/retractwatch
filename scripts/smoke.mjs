/**
 * RetractWatch Local Smoke Test Runner
 * Hits localhost endpoints to verify server integrity and route handling.
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3011";

async function runTests() {
  console.log(`\n🔍 Running RetractWatch smoke tests against ${BASE_URL}...\n`);
  let passed = 0;
  let failed = 0;

  // Test 1: GET / (Homepage)
  try {
    const res = await fetch(`${BASE_URL}/`);
    if (res.ok) {
      console.log("✅ [GET /] Homepage returned HTTP 200");
      passed++;
    } else {
      console.error(`❌ [GET /] Returned HTTP ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error(`❌ [GET /] Connection failed: ${err.message}`);
    failed++;
  }

  // Test 2: POST /api/extract-text (Validation check)
  try {
    const res = await fetch(`${BASE_URL}/api/extract-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.status === 400) {
      console.log("✅ [POST /api/extract-text] Rejected empty payload with HTTP 400");
      passed++;
    } else {
      console.error(`❌ [POST /api/extract-text] Unexpected status: ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error(`❌ [POST /api/extract-text] Failed: ${err.message}`);
    failed++;
  }

  // Test 3: POST /api/check (Validation check)
  try {
    const res = await fetch(`${BASE_URL}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.status === 400 || res.status === 503) {
      console.log(`✅ [POST /api/check] Validation handled properly with HTTP ${res.status}`);
      passed++;
    } else {
      console.error(`❌ [POST /api/check] Unexpected status: ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error(`❌ [POST /api/check] Failed: ${err.message}`);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Smoke test results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
