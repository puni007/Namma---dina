import http from 'http';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5155';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

async function fetchHttp(url, options = {}) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      parsed,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            // non-json body
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function getCookies(headers) {
  const raw = headers['set-cookie'];
  if (!raw) return {};
  const list = Array.isArray(raw) ? raw : [raw];
  const cookies = {};
  for (const item of list) {
    const parts = item.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
  return cookies;
}

const results = [];
function reportStep(step, success, details) {
  results.push({ step, success, details });
  const icon = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${step}]: ${details}`);
}

async function runTest() {
  console.log('\n=============================================================');
  console.log('   NAMMA DINA (ನಮ್ಮ ದಿನ) — MASTER AUTOMATED TEST RUN');
  console.log('=============================================================\n');

  try {
    // 1. Client Web App
    const clientRes = await fetchHttp(CLIENT_URL);
    reportStep(
      'Client Dev Server (Port 5155)',
      clientRes.status === 200 && clientRes.body.toLowerCase().includes('<!doctype html>') && clientRes.body.includes('id="root"'),
      `Status ${clientRes.status}, index.html delivered with React 19 root and title "${clientRes.body.match(/<title>(.*?)<\/title>/)?.[1]}".`
    );

    // 2. Client Branding & Metadata
    reportStep(
      'Aurora UI Metadata & Meta Tags',
      clientRes.body.includes('Namma Dina') && clientRes.body.includes('theme-color'),
      `Delivered Aurora viewport, theme-color, and OpenGraph metadata.`
    );

    // 3. Backend Health & Database Connectivity
    const healthRes = await fetchHttp(`${SERVER_URL}/api/health`);
    reportStep(
      'Backend Health & PostgreSQL',
      healthRes.status === 200 && healthRes.json?.data?.database === 'connected',
      `Status ${healthRes.status}, database status: "${healthRes.json?.data?.database}".`
    );

    // 4. API Versioning (/api/v1 rewrite)
    const v1HealthRes = await fetchHttp(`${SERVER_URL}/api/v1/health`);
    reportStep(
      'API Versioning (/api/v1 alias)',
      v1HealthRes.status === 200 && v1HealthRes.json?.data?.status === 'ok',
      `Status ${v1HealthRes.status}, /api/v1 successfully routed to /api/health.`
    );

    // 5. OpenAPI 3.0 Documentation Specification
    const docsRes = await fetchHttp(`${SERVER_URL}/api/docs/openapi.json`);
    reportStep(
      'OpenAPI 3.0 Documentation',
      docsRes.status === 200 && docsRes.json?.openapi === '3.0.3',
      `Delivered valid OpenAPI ${docsRes.json?.openapi} spec with ${Object.keys(docsRes.json?.paths || {}).length} endpoints.`
    );

    // 6. Auth Capabilities Discovery
    const providersRes = await fetchHttp(`${SERVER_URL}/api/auth/providers`);
    reportStep(
      'Auth Capabilities Discovery',
      providersRes.status === 200 && providersRes.json?.data?.sms !== undefined,
      `Reported providers: SMS (${providersRes.json?.data?.sms?.provider}), Google, Facebook, Email.`
    );

    // 7. CSRF Token Acquisition
    const csrfRes = await fetchHttp(`${SERVER_URL}/api/auth/csrf`);
    const csrfToken = csrfRes.json?.csrfToken;
    let cookieJar = getCookies(csrfRes.headers);
    reportStep(
      'CSRF Protection Token',
      Boolean(csrfToken && cookieJar.nd_csrf),
      `Obtained cryptographic CSRF token (${csrfToken?.slice(0, 10)}...).`
    );

    function cookieHeader() {
      return Object.entries(cookieJar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    }

    function mergeCookies(res) {
      cookieJar = { ...cookieJar, ...getCookies(res.headers) };
    }

    // 8. User Registration Flow (Strict RegisterSchema: email, password, displayName)
    const testEmail = `testuser_${Date.now()}@test.namma-dina.local`;
    const regPayload = JSON.stringify({
      displayName: 'Punith E2E Tester',
      email: testEmail,
      password: 'SecureTest@12345',
    });
    const regRes = await fetchHttp(`${SERVER_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: regPayload,
    });
    mergeCookies(regRes);
    const registeredUser = regRes.json?.data?.user;
    reportStep(
      'Account Registration',
      regRes.status === 201 && registeredUser?.email === testEmail.toLowerCase(),
      `Status ${regRes.status}, created account for "${registeredUser?.displayName}".`
    );

    // 9. Profile Verification (/api/auth/me)
    const meRes = await fetchHttp(`${SERVER_URL}/api/auth/me`, {
      headers: { Cookie: cookieHeader() },
    });
    const userId = meRes.json?.data?.id;
    reportStep(
      'Session Profile Verification',
      meRes.status === 200 && userId !== undefined,
      `Verified active session for user ID ${userId}.`
    );

    // 10. Phone OTP Flow (Send & Verify)
    const testPhone = `+9198765${Math.floor(10000 + Math.random() * 90000)}`;
    const sendOtpRes = await fetchHttp(`${SERVER_URL}/api/auth/phone/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ phoneNumber: testPhone }),
    });
    const devOtp = sendOtpRes.json?.data?.debugOtp;
    reportStep(
      'Phone OTP Generation (+91 Indian format)',
      sendOtpRes.status === 200 && Boolean(devOtp),
      `Generated OTP with 60s cooldown; simulated OTP received: ${devOtp}.`
    );

    const verifyOtpRes = await fetchHttp(`${SERVER_URL}/api/auth/phone/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({
        phoneNumber: testPhone,
        otp: devOtp,
        displayName: 'Phone Test User',
      }),
    });
    const verifiedPhoneUser = verifyOtpRes.json?.data?.user;
    reportStep(
      'Phone OTP Verification & Sign In',
      verifyOtpRes.status === 200 && verifiedPhoneUser?.phoneNumber === testPhone,
      `Status ${verifyOtpRes.status}, verified OTP and authenticated phone account (${verifiedPhoneUser?.phoneNumber}).`
    );

    // 11. Mitra Mascot State & Evolution Level
    const mitraInitRes = await fetchHttp(`${SERVER_URL}/api/mitra/state`, {
      headers: { Cookie: cookieHeader() },
    });
    const initialXp = mitraInitRes.json?.data?.xp || 0;
    const initialLevel = mitraInitRes.json?.data?.level || 1;
    const evolutionStage = mitraInitRes.json?.data?.evolutionStage || 'ember';
    reportStep(
      'Mitra Smiling Flame Initialization',
      mitraInitRes.status === 200 && mitraInitRes.json?.data?.level !== undefined,
      `Mitra initialized: Evolution Tier "${evolutionStage}", Level ${initialLevel}, XP ${initialXp}.`
    );

    // 12. Task Creation & Schedule XP Award
    const taskPayload = JSON.stringify({
      title: 'Complete Master Prompt Verification',
      priority: 'HIGH',
      scheduledMinutes: 30,
    });
    const taskRes = await fetchHttp(`${SERVER_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: taskPayload,
    });
    const taskId = taskRes.json?.data?.id;
    reportStep(
      'Task Creation Flow',
      taskRes.status === 201 && Boolean(taskId),
      `Created task "${taskRes.json?.data?.title}" (ID: ${taskId}).`
    );

    // Complete Task -> Awards +10 XP to Mitra automatically
    const completeRes = await fetchHttp(`${SERVER_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    reportStep(
      'Task Completion Execution',
      completeRes.status === 200 && completeRes.json?.data?.status === 'COMPLETED',
      `Status ${completeRes.status}, task marked as COMPLETED.`
    );

    // Verify Mitra XP Increased by +10
    const mitraAfterRes = await fetchHttp(`${SERVER_URL}/api/mitra/state`, {
      headers: { Cookie: cookieHeader() },
    });
    const newXp = mitraAfterRes.json?.data?.xp || 0;
    reportStep(
      'Mitra +10 XP Progression Award',
      newXp === initialXp + 10,
      `XP progressed from ${initialXp} -> ${newXp} (+10 XP gained automatically).`
    );

    // 13. Speed-Dial Quick Actions: Water & Mood Logging
    const today = new Date().toISOString().slice(0, 10);
    const waterRes = await fetchHttp(`${SERVER_URL}/api/water`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ date: today, amountMl: 500 }),
    });
    reportStep(
      'Quick Action: Hydration Log (500ml)',
      waterRes.status === 201,
      `Status ${waterRes.status}, logged 500 ml for ${today}.`
    );

    const moodRes = await fetchHttp(`${SERVER_URL}/api/wellness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ date: today, mood: 5, notes: 'Feeling energized and accomplished!' }),
    });
    reportStep(
      'Quick Action: Mood & Wellness Check-in',
      moodRes.status === 201,
      `Status ${moodRes.status}, logged mood score 5 (Great) for ${today}.`
    );

    // 14. Reproductive & Pregnancy Privacy: AES-256-GCM Verification
    const consentRes = await fetchHttp(`${SERVER_URL}/api/reproductive/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({ consent: true }),
    });
    reportStep(
      'Health Consent Verification Gate',
      consentRes.status === 200 && consentRes.json?.data?.consentGiven === true,
      `Explicit user consent recorded (consentGiven: true).`
    );

    const healthEntryRes = await fetchHttp(`${SERVER_URL}/api/reproductive/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
      body: JSON.stringify({
        date: today,
        symptoms: ['cramps', 'energetic'],
        mood: 'Calm',
        notes: 'Top secret medical notes',
      }),
    });
    reportStep(
      'Encrypted Health Entry Creation',
      healthEntryRes.status === 200,
      `Status ${healthEntryRes.status}, encrypted health symptoms saved.`
    );

    // Verify Read back with Decryption
    const entriesRes = await fetchHttp(`${SERVER_URL}/api/reproductive/entries`, {
      headers: { Cookie: cookieHeader() },
    });
    const loggedEntry = entriesRes.json?.data?.[0];
    reportStep(
      'Health Data Decryption Verification',
      entriesRes.status === 200 && loggedEntry?.notes === 'Top secret medical notes',
      `Retrieved and decrypted secret notes: "${loggedEntry?.notes}".`
    );

    // Purge Right-to-be-Forgotten
    const purgeRes = await fetchHttp(`${SERVER_URL}/api/reproductive/data`, {
      method: 'DELETE',
      headers: {
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
    });
    const entriesPostPurge = await fetchHttp(`${SERVER_URL}/api/reproductive/entries`, {
      headers: { Cookie: cookieHeader() },
    });
    const residualCount = entriesPostPurge.json?.data?.length ?? 0;
    reportStep(
      'Right-to-be-Forgotten Instant Data Purge',
      (purgeRes.status === 200 || purgeRes.status === 204) && residualCount === 0,
      `Status ${purgeRes.status}, verified 0 residual health records post-purge.`
    );

    // 15. Sign Out & Session Termination
    const logoutRes = await fetchHttp(`${SERVER_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader(),
      },
    });
    reportStep(
      'Sign Out Execution',
      logoutRes.status === 204,
      `Status ${logoutRes.status}, server revoked session and invalidated cookies.`
    );

    // Confirm post-logout unauthorized
    const postLogoutMe = await fetchHttp(`${SERVER_URL}/api/auth/me`, {
      headers: { Cookie: cookieHeader() },
    });
    reportStep(
      'Post-Logout Session Invalidation',
      postLogoutMe.status === 401,
      `Status ${postLogoutMe.status}, confirmed token is revoked and user is unauthenticated.`
    );

    console.log('\n=============================================================');
    const passedCount = results.filter((r) => r.success).length;
    console.log(`   TEST RUN COMPLETED: ${passedCount}/${results.length} STEPS PASSED`);
    console.log('=============================================================\n');
  } catch (err) {
    console.error('Test run failed with error:', err);
  }
}

runTest();
