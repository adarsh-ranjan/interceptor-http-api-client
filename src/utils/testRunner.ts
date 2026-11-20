import { HttpResponse, TestResult, Environment } from '../types';
import { getVariableMap, interpolateString } from './variables';

export function runTestScript(
  scriptText: string,
  response: HttpResponse,
  onSetEnvVar?: (key: string, value: string) => void,
  activeEnv?: Environment,
  environments?: Environment[]
): TestResult[] {
  if (!scriptText || !scriptText.trim()) return [];

  const results: TestResult[] = [];

  const createExpect = (actual: any, isNot = false): any => ({
    toBe: (expected: any) => {
      const match = actual === expected;
      if (isNot ? match : !match) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`);
      }
    },
    toEqual: (expected: any) => {
      const match = JSON.stringify(actual) === JSON.stringify(expected);
      if (isNot ? match : !match) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'not to equal' : 'to equal'} ${JSON.stringify(expected)}`);
      }
    },
    toBeLessThan: (limit: number) => {
      const match = typeof actual === 'number' && actual < limit;
      if (isNot ? match : !match) {
        throw new Error(`Expected ${actual} ${isNot ? 'not to be less than' : 'to be less than'} ${limit}`);
      }
    },
    toBeGreaterThan: (limit: number) => {
      const match = typeof actual === 'number' && actual > limit;
      if (isNot ? match : !match) {
        throw new Error(`Expected ${actual} ${isNot ? 'not to be greater than' : 'to be greater than'} ${limit}`);
      }
    },
    toContain: (substringOrItem: any) => {
      let match = false;
      if (typeof actual === 'string') {
        match = actual.includes(String(substringOrItem));
      } else if (Array.isArray(actual)) {
        match = actual.includes(substringOrItem);
      }
      if (isNot ? match : !match) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(substringOrItem)}`);
      }
    },
    toBeTruthy: () => {
      const match = !!actual;
      if (isNot ? match : !match) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'not to be truthy' : 'to be truthy'}`);
      }
    },
    toBeFalsy: () => {
      const match = !actual;
      if (isNot ? match : !match) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'not to be falsy' : 'to be falsy'}`);
      }
    },
    toBeNull: () => {
      const match = actual === null;
      if (isNot ? match : !match) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'not to be null' : 'to be null'}`);
      }
    },
    get not() {
      return createExpect(actual, !isNot);
    },
  });

  const interceptorContext = {
    test: (name: string, fn: () => void) => {
      const id = Math.random().toString(36).substring(2, 9);
      try {
        fn();
        results.push({ id, name, passed: true });
      } catch (err: any) {
        results.push({ id, name, passed: false, error: err.message });
      }
    },
    expect: (actual: any) => createExpect(actual),
    getEnvironmentVariable: (key: string) => {
      const vars = getVariableMap(activeEnv, environments?.find((e) => e.isGlobal));
      return vars[key] ?? null;
    },
    setEnvironmentVariable: (key: string, value: any) => {
      if (onSetEnvVar && key) {
        onSetEnvVar(key, String(value));
      }
    },
    environment: {
      get: (key: string) => {
        const vars = getVariableMap(activeEnv, environments?.find((e) => e.isGlobal));
        return vars[key] ?? null;
      },
      set: (key: string, value: any) => {
        if (onSetEnvVar && key) {
          onSetEnvVar(key, String(value));
        }
      },
      has: (key: string) => {
        const vars = getVariableMap(activeEnv, environments?.find((e) => e.isGlobal));
        return key in vars;
      },
    },
    replaceVariables: (text: string) => {
      const vars = getVariableMap(activeEnv, environments?.find((e) => e.isGlobal));
      return interpolateString(text, vars);
    },
    log: (...args: any[]) => {
      console.log('[Interceptor Test]', ...args);
    },
  };

  const pmContext = {
    test: interceptorContext.test,
    expect: interceptorContext.expect,
    environment: interceptorContext.environment,
    response: {
      json: () => response.data,
      text: () => response.rawBody,
      status: response.status,
    },
  };

  try {
    // Execute test script in isolated scope with interceptor, res, and pm
    const testFunction = new Function('interceptor', 'res', 'pm', scriptText);
    testFunction(interceptorContext, response, pmContext);
  } catch (globalErr: any) {
    results.push({
      id: 'syntax-error',
      name: 'Script Syntax / Execution Error',
      passed: false,
      error: globalErr.message,
    });
  }

  return results;
}

export const TEST_SNIPPETS = [
  {
    name: 'Status code: 200',
    code: `interceptor.test("Status code is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n`,
  },
  {
    name: 'Response time < 500ms',
    code: `interceptor.test("Response time is under 500ms", () => {\n  interceptor.expect(res.timeMs).toBeLessThan(500);\n});\n`,
  },
  {
    name: 'Content-Type is JSON',
    code: `interceptor.test("Response is JSON", () => {\n  interceptor.expect(res.isJson).toBe(true);\n});\n`,
  },
  {
    name: 'Body contains string',
    code: `interceptor.test("Body contains text", () => {\n  interceptor.expect(res.rawBody).toContain("success");\n});\n`,
  },
  {
    name: 'Get Environment Variable',
    code: `interceptor.test("Read environment variable", () => {\n  const baseUrl = interceptor.getEnvironmentVariable("baseUrl");\n  interceptor.log("Active baseUrl is:", baseUrl);\n  interceptor.expect(baseUrl).toBeTruthy();\n});\n`,
  },
  {
    name: 'Set Environment Variable',
    code: `interceptor.test("Store auth token", () => {\n  // Assuming response JSON contains a token or id\n  if (res.data && res.data.token) {\n    interceptor.setEnvironmentVariable("authToken", res.data.token);\n  }\n});\n`,
  },
];
