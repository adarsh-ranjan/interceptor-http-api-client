import { HttpRequest } from '../types';

export const DEFAULT_REQUEST: HttpRequest = {
  id: 'req-initial',
  name: 'New Request',
  method: 'GET',
  url: '{{baseUrl}}/posts/1',
  params: [],
  headers: [
    {
      id: 'h-1',
      key: 'Accept',
      value: 'application/json',
      enabled: true,
      description: 'Accepted response content-type',
    },
  ],
  auth: { type: 'none' },
  bodyType: 'none',
  bodyContent: '',
  formData: [],
  urlEncoded: [],
  testScript: `// Automatic assertions run upon response\ninterceptor.test("Status code is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n\ninterceptor.test("Response is JSON", () => {\n  interceptor.expect(res.isJson).toBe(true);\n});\n`,
};
