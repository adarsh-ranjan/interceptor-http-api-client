import assert from 'node:assert/strict';
import { isCurlCommand, parseCurlCommand } from '../src/utils/curlParser';

console.log('Running Interceptor cURL Parser Test Suite...\n');

// 1. isCurlCommand detection
assert.equal(isCurlCommand(''), false, 'Empty string should not be curl');
assert.equal(isCurlCommand('https://api.example.com'), false, 'Plain URL should not be curl');
assert.equal(isCurlCommand('curl https://api.example.com'), true, 'curl URL should be true');
assert.equal(isCurlCommand('$ curl https://api.example.com'), true, '$ curl should be true');
assert.equal(isCurlCommand('   CURL -X POST http://localhost:3000   '), true, 'Case insensitive CURL should be true');

// 2. Simple GET request
const getReq = parseCurlCommand('curl "https://api.example.com/items?page=1&limit=20"');
assert.ok(getReq);
assert.equal(getReq.method, 'GET');
assert.equal(getReq.url, 'https://api.example.com/items?page=1&limit=20');
assert.equal(getReq.params.length, 2);
assert.equal(getReq.params[0].key, 'page');
assert.equal(getReq.params[0].value, '1');
assert.equal(getReq.params[1].key, 'limit');
assert.equal(getReq.params[1].value, '20');

// 3. POST request with JSON and Bearer auth
const postJson = parseCurlCommand(`curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my-secret-token" \\
  -d '{"name": "Alice", "role": "admin"}'`);
assert.ok(postJson);
assert.equal(postJson.method, 'POST');
assert.equal(postJson.auth.type, 'bearer');
assert.equal(postJson.auth.bearerToken, 'my-secret-token');
assert.equal(postJson.bodyType, 'json');
const parsedBody = JSON.parse(postJson.bodyContent);
assert.equal(parsedBody.name, 'Alice');
assert.equal(parsedBody.role, 'admin');

// 4. Basic Auth (-u user:pass)
const basicAuth = parseCurlCommand(`curl -u "admin:secretpassword" https://httpbin.org/basic-auth/admin/secretpassword`);
assert.ok(basicAuth);
assert.equal(basicAuth.auth.type, 'basic');
assert.equal(basicAuth.auth.basicUsername, 'admin');
assert.equal(basicAuth.auth.basicPassword, 'secretpassword');

// 5. Basic Auth via Authorization: Basic header (base64)
const basicHeader = parseCurlCommand(`curl -H "Authorization: Basic YWRtaW46c2VjcmV0cGFzc3dvcmQ=" https://httpbin.org/basic-auth`);
assert.ok(basicHeader);
assert.equal(basicHeader.auth.type, 'basic');
assert.equal(basicHeader.auth.basicUsername, 'admin');
assert.equal(basicHeader.auth.basicPassword, 'secretpassword');

// 6. Urlencoded payload
const urlenc = parseCurlCommand(`curl -X POST https://httpbin.org/post -d "grant_type=client_credentials&client_id=foo123"`);
assert.ok(urlenc);
assert.equal(urlenc.bodyType, 'urlencoded');
assert.equal(urlenc.urlEncoded?.length, 2);
assert.equal(urlenc.urlEncoded?.[0].key, 'grant_type');
assert.equal(urlenc.urlEncoded?.[0].value, 'client_credentials');

// 7. Multipart form-data with text & file
const formData = parseCurlCommand(`curl -X POST https://api.example.com/upload -F "document=@/tmp/report.pdf;type=application/pdf" -F "department=Engineering"`);
assert.ok(formData);
assert.equal(formData.bodyType, 'form-data');
assert.equal(formData.formData?.length, 2);
assert.equal(formData.formData?.[0].key, 'document');
assert.equal(formData.formData?.[0].type, 'file');
assert.equal(formData.formData?.[0].filePath, '/tmp/report.pdf');
assert.equal(formData.formData?.[0].fileName, 'report.pdf');
assert.equal(formData.formData?.[1].key, 'department');
assert.equal(formData.formData?.[1].value, 'Engineering');
assert.equal(formData.formData?.[1].type, 'text');

// 8. Custom headers and cookies
const headersReq = parseCurlCommand(`curl -b "session=xyz123" -A "CustomAgent/1.0" -e "https://referrer.com" -H "X-API-Key: test-key" https://api.example.com`);
assert.ok(headersReq);
const hKeys = headersReq.headers.map(h => h.key.toLowerCase());
assert.ok(hKeys.includes('user-agent'));
assert.ok(hKeys.includes('referer'));
assert.ok(hKeys.includes('cookie'));
assert.ok(hKeys.includes('x-api-key'));

// 9. Method inference from data
const inferredPost = parseCurlCommand(`curl https://api.example.com/comments -d "hello world"`);
assert.ok(inferredPost);
assert.equal(inferredPost.method, 'POST');
assert.equal(inferredPost.bodyType, 'text');
assert.equal(inferredPost.bodyContent, 'hello world');

// 10. Head request (-I)
const headReq = parseCurlCommand(`curl -I https://api.example.com`);
assert.ok(headReq);
assert.equal(headReq.method, 'HEAD');

console.log('✓ All 10 test scenarios passed successfully!');
