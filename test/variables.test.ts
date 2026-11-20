import assert from 'node:assert/strict';
import {
  extractVariablesFromText,
  findVariableAtCharIndex,
  findVariableInMultilineText,
  resolveVariableInfo,
  interpolateRequest,
} from '../src/utils/variables';
import { runTestScript } from '../src/utils/testRunner';
import { Environment, HttpRequest, HttpResponse } from '../src/types';

console.log('Running Interceptor Environment Variables & Hover Test Suite...\n');

// 1. extractVariablesFromText
const text1 = 'https://{{baseUrl}}/users/{{userId}}?token={{apiKey}}';
const vars1 = extractVariablesFromText(text1);
assert.equal(vars1.length, 3, 'Should find 3 variables');
assert.equal(vars1[0].varName, 'baseUrl');
assert.equal(vars1[0].startIndex, 8);
assert.equal(vars1[0].endIndex, 19);
assert.equal(vars1[1].varName, 'userId');
assert.equal(vars1[2].varName, 'apiKey');

// 2. findVariableAtCharIndex
assert.equal(findVariableAtCharIndex(text1, 7), null, 'Index 7 is before baseUrl');
assert.notEqual(findVariableAtCharIndex(text1, 8), null, 'Index 8 is inside baseUrl');
assert.equal(findVariableAtCharIndex(text1, 8)?.varName, 'baseUrl');
assert.equal(findVariableAtCharIndex(text1, 18)?.varName, 'baseUrl');
assert.equal(findVariableAtCharIndex(text1, 19), null, 'Index 19 is /');
assert.equal(findVariableAtCharIndex(text1, 26)?.varName, 'userId');

// 3. resolveVariableInfo - Active Environment (Resolved)
const activeEnv: Environment = {
  id: 'env-1',
  name: 'Development',
  variables: [
    { id: 'v1', key: 'baseUrl', value: 'https://api.dev.com', enabled: true },
    { id: 'v2', key: 'disabledKey', value: 'secret', enabled: false },
  ],
};

const res1 = resolveVariableInfo('baseUrl', activeEnv);
assert.equal(res1.isResolved, true);
assert.equal(res1.source, 'environment');
assert.equal(res1.sourceName, 'Development');
assert.equal(res1.value, 'https://api.dev.com');

// 4. resolveVariableInfo - Active Environment (Disabled)
const res2 = resolveVariableInfo('disabledKey', activeEnv);
assert.equal(res2.isResolved, false);
assert.equal(res2.source, 'unresolved');
assert.ok(res2.error?.includes('disabled'));

// 5. resolveVariableInfo - Global Environment
const globalEnv: Environment = {
  id: 'env-global',
  name: 'Globals',
  isGlobal: true,
  variables: [
    { id: 'g1', key: 'globalPort', value: '8080', enabled: true },
  ],
};

const res3 = resolveVariableInfo('globalPort', activeEnv, [activeEnv, globalEnv]);
assert.equal(res3.isResolved, true);
assert.equal(res3.source, 'global');
assert.equal(res3.value, '8080');

// 6. resolveVariableInfo - Dynamic System Variables
const resGuid = resolveVariableInfo('$guid');
assert.equal(resGuid.isResolved, true);
assert.equal(resGuid.source, 'dynamic');

const resTimestamp = resolveVariableInfo('$timestamp');
assert.equal(resTimestamp.isResolved, true);
assert.equal(resTimestamp.source, 'dynamic');

const resIso = resolveVariableInfo('$isoTimestamp');
assert.equal(resIso.isResolved, true);
assert.equal(resIso.source, 'dynamic');

const resRandom = resolveVariableInfo('$randomInt');
assert.equal(resRandom.isResolved, true);
assert.equal(resRandom.source, 'dynamic');

// 7. resolveVariableInfo - Unresolved / Not found
const resNotFound = resolveVariableInfo('nonExistentVar', activeEnv);
assert.equal(resNotFound.isResolved, false);
assert.equal(resNotFound.source, 'unresolved');
assert.ok(resNotFound.error?.includes('not defined'));

// 8. resolveVariableInfo - Without active environment
const resNoEnv = resolveVariableInfo('baseUrl', undefined);
assert.equal(resNoEnv.isResolved, false);
assert.equal(resNoEnv.source, 'unresolved');
assert.ok(resNoEnv.error?.includes('No active environment'));

// 9. findVariableInMultilineText
const multilineSample = `{\n  "url": "{{baseUrl}}/items",\n  "auth": "{{apiKey}}"\n}`;
const multiVar1 = findVariableInMultilineText(multilineSample, 1, 12);
assert.ok(multiVar1);
assert.equal(multiVar1.varName, 'baseUrl');
const multiVar2 = findVariableInMultilineText(multilineSample, 2, 12);
assert.ok(multiVar2);
assert.equal(multiVar2.varName, 'apiKey');

// 10. interpolateRequest across Auth, Headers, Params, Body
const testReq: HttpRequest = {
  id: 'req-test',
  name: 'Test Request',
  method: 'POST',
  url: '{{baseUrl}}/posts?user={{userId}}',
  params: [{ id: 'p1', key: 'user', value: '{{userId}}', enabled: true }],
  headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer {{apiKey}}', enabled: true }],
  auth: { type: 'bearer', bearerToken: '{{apiKey}}' },
  bodyType: 'json',
  bodyContent: '{"userId": "{{userId}}", "token": "{{apiKey}}"}',
};

const fullEnv: Environment = {
  id: 'env-full',
  name: 'Production',
  variables: [
    { id: '1', key: 'baseUrl', value: 'https://api.prod.com', enabled: true },
    { id: '2', key: 'userId', value: '42', enabled: true },
    { id: '3', key: 'apiKey', value: 'prod_secret_123', enabled: true },
  ],
};

const interpolated = interpolateRequest(testReq, fullEnv);
assert.equal(interpolated.url, 'https://api.prod.com/posts?user=42');
assert.equal(interpolated.params[0].value, '42');
assert.equal(interpolated.headers[0].value, 'Bearer prod_secret_123');
assert.equal(interpolated.auth?.bearerToken, 'prod_secret_123');
assert.equal(interpolated.bodyContent, '{"userId": "42", "token": "prod_secret_123"}');

// 11. runTestScript with interceptor.getEnvironmentVariable and pm.environment.get
const dummyResponse: HttpResponse = {
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { id: 42 },
  rawBody: '{"id":42}',
  contentType: 'application/json',
  isJson: true,
  timeMs: 45,
  sizeBytes: 10,
};

const scriptCode = `
interceptor.test("Reads environment variable", () => {
  const base = interceptor.getEnvironmentVariable("baseUrl");
  interceptor.expect(base).toBe("https://api.prod.com");
});
pm.test("Reads via pm.environment", () => {
  const uid = pm.environment.get("userId");
  pm.expect(uid).toBe("42");
});
`;

const testRes = runTestScript(scriptCode, dummyResponse, undefined, fullEnv);
assert.equal(testRes.length, 2);
assert.equal(testRes[0].passed, true, testRes[0].error);
assert.equal(testRes[1].passed, true, testRes[1].error);

console.log('✓ All 11 environment variable & test suite scenarios passed successfully!');
