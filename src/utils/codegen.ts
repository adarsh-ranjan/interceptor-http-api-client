import { HttpRequest } from '../types';
import { syncUrlWithParams, keyValuesToRecord } from './http';
import { applyAuthToHeadersAndParams } from './auth';

export type SupportedLanguage =
  | 'curl'
  | 'javascript-fetch'
  | 'javascript-axios'
  | 'python-requests'
  | 'go'
  | 'dart';

export interface CodeGeneratorOption {
  id: SupportedLanguage;
  name: string;
  syntax: string;
}

export const CODE_LANGUAGES: CodeGeneratorOption[] = [
  { id: 'curl', name: 'cURL', syntax: 'bash' },
  { id: 'javascript-fetch', name: 'JavaScript (Fetch)', syntax: 'javascript' },
  { id: 'javascript-axios', name: 'JavaScript (Axios)', syntax: 'javascript' },
  { id: 'python-requests', name: 'Python (Requests)', syntax: 'python' },
  { id: 'go', name: 'Go (net/http)', syntax: 'go' },
  { id: 'dart', name: 'Dart (http)', syntax: 'dart' },
];

export function generateSnippet(req: HttpRequest, lang: SupportedLanguage): string {
  // Apply auth to headers & params
  const { headers: effectiveHeadersList, params: effectiveParamsList } =
    applyAuthToHeadersAndParams(req.auth, req.headers, req.params);

  const fullUrl = syncUrlWithParams(req.url, effectiveParamsList);
  const headersObj = keyValuesToRecord(effectiveHeadersList);
  const method = req.method.toUpperCase();

  const hasBody =
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    req.bodyType !== 'none';

  let bodyString = '';
  if (hasBody) {
    if (req.bodyType === 'json' || req.bodyType === 'text') {
      bodyString = req.bodyContent;
    } else if (req.bodyType === 'urlencoded' && req.urlEncoded) {
      bodyString = req.urlEncoded
        .filter((p) => p.enabled && p.key)
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
    }
  }

  switch (lang) {
    case 'curl': {
      let cmd = `curl -X ${method} "${fullUrl}"`;
      for (const [key, value] of Object.entries(headersObj)) {
        cmd += ` \\\n  -H "${key}: ${value}"`;
      }
      if (hasBody && bodyString) {
        // Escape quotes
        const escaped = bodyString.replace(/'/g, "'\\''");
        cmd += ` \\\n  -d '${escaped}'`;
      }
      return cmd;
    }

    case 'javascript-fetch': {
      let code = `const url = "${fullUrl}";\n\n`;
      code += `const options = {\n`;
      code += `  method: "${method}",\n`;

      if (Object.keys(headersObj).length > 0) {
        code += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')},\n`;
      }

      if (hasBody && bodyString) {
        if (req.bodyType === 'json') {
          try {
            const parsed = JSON.parse(bodyString);
            code += `  body: JSON.stringify(${JSON.stringify(parsed, null, 4).replace(/\n/g, '\n  ')}),\n`;
          } catch {
            code += `  body: JSON.stringify(${bodyString}),\n`;
          }
        } else {
          code += `  body: ${JSON.stringify(bodyString)},\n`;
        }
      }

      code += `};\n\n`;
      code += `try {\n`;
      code += `  const response = await fetch(url, options);\n`;
      code += `  const data = await response.json();\n`;
      code += `  console.log(data);\n`;
      code += `} catch (error) {\n`;
      code += `  console.error("Error:", error);\n`;
      code += `}`;
      return code;
    }

    case 'javascript-axios': {
      let code = `import axios from "axios";\n\n`;
      code += `const config = {\n`;
      code += `  method: "${method.toLowerCase()}",\n`;
      code += `  url: "${fullUrl}",\n`;

      if (Object.keys(headersObj).length > 0) {
        code += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')},\n`;
      }

      if (hasBody && bodyString) {
        if (req.bodyType === 'json') {
          try {
            const parsed = JSON.parse(bodyString);
            code += `  data: ${JSON.stringify(parsed, null, 4).replace(/\n/g, '\n  ')},\n`;
          } catch {
            code += `  data: ${bodyString},\n`;
          }
        } else {
          code += `  data: ${JSON.stringify(bodyString)},\n`;
        }
      }

      code += `};\n\n`;
      code += `try {\n`;
      code += `  const response = await axios(config);\n`;
      code += `  console.log(response.data);\n`;
      code += `} catch (error) {\n`;
      code += `  console.error("Error:", error);\n`;
      code += `}`;
      return code;
    }

    case 'python-requests': {
      let code = `import requests\n\n`;
      code += `url = "${fullUrl}"\n`;

      if (Object.keys(headersObj).length > 0) {
        code += `headers = ${JSON.stringify(headersObj, null, 4)}\n`;
      } else {
        code += `headers = {}\n`;
      }

      if (hasBody && bodyString) {
        if (req.bodyType === 'json') {
          try {
            const parsed = JSON.parse(bodyString);
            code += `payload = ${JSON.stringify(parsed, null, 4)}\n\n`;
            code += `response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)\n`;
          } catch {
            code += `payload = """${bodyString}"""\n\n`;
            code += `response = requests.${method.toLowerCase()}(url, headers=headers, data=payload)\n`;
          }
        } else {
          code += `payload = """${bodyString}"""\n\n`;
          code += `response = requests.${method.toLowerCase()}(url, headers=headers, data=payload)\n`;
        }
      } else {
        code += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers)\n`;
      }

      code += `print(response.status_code)\n`;
      code += `print(response.text)\n`;
      return code;
    }

    case 'go': {
      let code = `package main\n\n`;
      code += `import (\n`;
      code += `\t"fmt"\n`;
      code += `\t"io"\n`;
      code += `\t"net/http"\n`;
      if (hasBody && bodyString) {
        code += `\t"strings"\n`;
      }
      code += `)\n\n`;
      code += `func main() {\n`;
      code += `\turl := "${fullUrl}"\n`;

      if (hasBody && bodyString) {
        code += `\tpayload := strings.NewReader(\`${bodyString}\`)\n`;
        code += `\treq, err := http.NewRequest("${method}", url, payload)\n`;
      } else {
        code += `\treq, err := http.NewRequest("${method}", url, nil)\n`;
      }

      code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n\n`;

      for (const [key, value] of Object.entries(headersObj)) {
        code += `\treq.Header.Add("${key}", "${value}")\n`;
      }

      code += `\n\tres, err := http.DefaultClient.Do(req)\n`;
      code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n`;
      code += `\tdefer res.Body.Close()\n\n`;
      code += `\tbody, _ := io.ReadAll(res.Body)\n`;
      code += `\tfmt.Println(res.StatusCode)\n`;
      code += `\tfmt.Println(string(body))\n`;
      code += `}\n`;
      return code;
    }

    case 'dart': {
      let code = `import 'package:http/http.dart' as http;\n\n`;
      code += `void main() async {\n`;
      code += `  var url = Uri.parse('${fullUrl}');\n`;

      if (hasBody && bodyString) {
        code += `  var request = http.Request('${method}', url);\n`;
        code += `  request.body = r'''${bodyString}''';\n`;
        if (Object.keys(headersObj).length > 0) {
          code += `  request.headers.addAll(${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')});\n`;
        }
        code += `  http.StreamedResponse response = await request.send();\n`;
        code += `  print(response.statusCode);\n`;
        code += `  print(await response.stream.bytesToString());\n`;
      } else {
        if (Object.keys(headersObj).length > 0) {
          code += `  var headers = ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')};\n`;
          code += `  var response = await http.${method.toLowerCase()}(url, headers: headers);\n`;
        } else {
          code += `  var response = await http.${method.toLowerCase()}(url);\n`;
        }
        code += `  print(response.statusCode);\n`;
        code += `  print(response.body);\n`;
      }

      code += `}\n`;
      return code;
    }

    default:
      return '';
  }
}
