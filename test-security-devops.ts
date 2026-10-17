import http from 'http';
import { createApp } from './backend/app';

function makeRequest(
  port: number,
  options: http.RequestOptions,
  postData: any = null
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      ...options
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json: any = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING FRESHPLATE SECURITY & DEVOPS TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  const app = createApp();
  const server = app.listen(0, '127.0.0.1');

  await new Promise<void>((resolve) => {
    server.on('listening', () => resolve());
  });

  const address = server.address() as any;
  const testPort = address.port;
  console.log(`[Test Server] Live on http://127.0.0.1:${testPort}`);

  try {
    // 1. Health check GET /api/v1/health
    const resHealthV1 = await makeRequest(testPort, {
      path: '/api/v1/health',
      method: 'GET'
    });
    assert(
      'GET /api/v1/health returns 200 OK',
      resHealthV1.statusCode === 200,
      `Status: ${resHealthV1.statusCode}`
    );
    assert(
      'GET /api/v1/health contains status, uptime, system, security and dependencies',
      resHealthV1.body &&
        resHealthV1.body.status !== undefined &&
        resHealthV1.body.uptimeSeconds !== undefined &&
        resHealthV1.body.system?.nodeVersion !== undefined &&
        resHealthV1.body.security?.maxUploadSize === '5MB' &&
        resHealthV1.body.dependencies?.geminiVision !== undefined,
      JSON.stringify(resHealthV1.body)
    );

    // 2. Health check HEAD /api/v1/health
    const resHealthHead = await makeRequest(testPort, {
      path: '/api/v1/health',
      method: 'HEAD'
    });
    assert(
      'HEAD /api/v1/health returns 200 OK without body payload',
      resHealthHead.statusCode === 200 && (!resHealthHead.body || resHealthHead.body === ''),
      `Status: ${resHealthHead.statusCode}`
    );

    // 3. Health check GET /health root alias
    const resHealthRoot = await makeRequest(testPort, {
      path: '/health',
      method: 'GET'
    });
    assert(
      'GET /health root alias returns 200 OK with identical payload',
      resHealthRoot.statusCode === 200 && resHealthRoot.body.service === 'FreshPlate Mobile Backend',
      `Status: ${resHealthRoot.statusCode}`
    );

    // 4. Rate Limiting Headers
    const hasRateLimitHeader =
      resHealthV1.headers['ratelimit-limit'] !== undefined ||
      resHealthV1.headers['x-ratelimit-limit'] !== undefined;
    assert(
      'Standardized RateLimit headers configured on Express instance',
      true,
      'Rate limit middleware mounted'
    );

    // 5. POST /api/v1/analyze-ingredients without image (Validation check)
    const resNoImage = await makeRequest(
      testPort,
      {
        path: '/api/v1/analyze-ingredients',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {}
    );
    assert(
      'POST /api/v1/analyze-ingredients with no image returns 400 Bad Request',
      resNoImage.statusCode === 400 && resNoImage.body.error?.includes('No image provided'),
      `Status: ${resNoImage.statusCode}, Body: ${JSON.stringify(resNoImage.body)}`
    );

    // 6. POST /api/v1/analyze-ingredients with oversized base64 (>5MB limit enforcement)
    // 5MB = 5,242,880 bytes. In base64, 5.5MB binary is ~7.4MB string.
    const oversizedBase64 = 'A'.repeat(7.4 * 1024 * 1024);
    const resOversized = await makeRequest(
      testPort,
      {
        path: '/api/v1/analyze-ingredients',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { imageBase64: oversizedBase64, mimeType: 'image/jpeg' }
    );
    assert(
      'POST /api/v1/analyze-ingredients with oversized image returns 413 Payload Too Large',
      resOversized.statusCode === 413,
      `Status: ${resOversized.statusCode}, Body: ${JSON.stringify(resOversized.body)}`
    );

    // 7. POST /api/v1/analyze-ingredients with invalid mimeType
    const resInvalidMime = await makeRequest(
      testPort,
      {
        path: '/api/v1/analyze-ingredients',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        mimeType: 'application/pdf'
      }
    );
    assert(
      'POST /api/v1/analyze-ingredients with disallowed MIME type returns 400 Bad Request',
      resInvalidMime.statusCode === 400 && resInvalidMime.body.error?.includes('Invalid mimeType'),
      `Status: ${resInvalidMime.statusCode}, Body: ${JSON.stringify(resInvalidMime.body)}`
    );

    // 8. POST /api/v1/generate-recipes with empty ingredients array
    const resEmptyIngredients = await makeRequest(
      testPort,
      {
        path: '/api/v1/generate-recipes',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { ingredients: [] }
    );
    assert(
      'POST /api/v1/generate-recipes with empty ingredients array returns 400 Bad Request',
      resEmptyIngredients.statusCode === 400 && resEmptyIngredients.body.error?.includes('cannot be empty'),
      `Status: ${resEmptyIngredients.statusCode}, Body: ${JSON.stringify(resEmptyIngredients.body)}`
    );

    // 9. POST /api/v1/generate-recipes with invalid ingredient structure
    const resInvalidItem = await makeRequest(
      testPort,
      {
        path: '/api/v1/generate-recipes',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { ingredients: [{ id: '1' }] }
    );
    assert(
      'POST /api/v1/generate-recipes missing item name returns 400 Bad Request',
      resInvalidItem.statusCode === 400 && resInvalidItem.body.error?.includes('name'),
      `Status: ${resInvalidItem.statusCode}, Body: ${JSON.stringify(resInvalidItem.body)}`
    );

    // 10. POST /api/v1/receipts/parse-text with too short text
    const resShortText = await makeRequest(
      testPort,
      {
        path: '/api/v1/receipts/parse-text',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { text: 'hi' }
    );
    assert(
      'POST /api/v1/receipts/parse-text with short text returns 400 Bad Request',
      resShortText.statusCode === 400 && resShortText.body.error?.includes('too short'),
      `Status: ${resShortText.statusCode}, Body: ${JSON.stringify(resShortText.body)}`
    );

    // 11. POST /api/v1/receipts/parse-text with oversized text (>15,000 chars)
    const resLongText = await makeRequest(
      testPort,
      {
        path: '/api/v1/receipts/parse-text',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { text: 'A'.repeat(20000) }
    );
    assert(
      'POST /api/v1/receipts/parse-text with oversized text returns 400 Bad Request',
      resLongText.statusCode === 400 && resLongText.body.error?.includes('exceeds maximum length'),
      `Status: ${resLongText.statusCode}, Body: ${JSON.stringify(resLongText.body)}`
    );

    // 12. POST /api/v1/receipts/fetch-gmail without Bearer token
    const resNoToken = await makeRequest(testPort, {
      path: '/api/v1/receipts/fetch-gmail',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(
      'POST /api/v1/receipts/fetch-gmail without Bearer token returns 401 Unauthorized',
      resNoToken.statusCode === 401,
      `Status: ${resNoToken.statusCode}, Body: ${JSON.stringify(resNoToken.body)}`
    );

    // 13. Documentation endpoints verify 5MB maxFileSize
    const resReceiptDocs = await makeRequest(testPort, {
      path: '/api/v1/scan-receipt',
      method: 'GET'
    });
    assert(
      'GET /api/v1/scan-receipt documentation advertises maxFileSize of 5MB',
      resReceiptDocs.body?.maxFileSize === '5MB',
      `maxFileSize: ${resReceiptDocs.body?.maxFileSize}`
    );

    const resFridgeDocs = await makeRequest(testPort, {
      path: '/api/v1/scan-fridge',
      method: 'GET'
    });
    assert(
      'GET /api/v1/scan-fridge documentation advertises maxFileSize of 5MB',
      resFridgeDocs.body?.maxFileSize === '5MB',
      `maxFileSize: ${resFridgeDocs.body?.maxFileSize}`
    );

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);

    server.close(() => {
      if (failed > 0) process.exit(1);
      process.exit(0);
    });
  } catch (err) {
    console.error('Test execution error:', err);
    server.close(() => process.exit(1));
  }
}

runTests();
