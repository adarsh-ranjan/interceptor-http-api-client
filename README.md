# Interceptor ⚡

A modern, lightning-fast, cross-platform desktop API client (Postman alternative) built with **Electron**, **React 19**, **TypeScript**, and **Tailwind CSS**.

[![Roadmap](https://img.shields.io/badge/Roadmap-Phase%201%20to%206%20Complete-emerald)](./ROADMAP.md)

---

## 📖 Table of Contents
- [✨ Core Capabilities](#-core-capabilities)
  - [Phase 1: Core Engine & Workbench](#phase-1-core-engine--workbench)
  - [Phase 2: Collections & Postman Migration](#phase-2-collections--postman-migration)
  - [Phase 3: Environments & Dynamic Variables](#phase-3-environments--dynamic-variables)
  - [Phase 4: Authentication & Rich Payloads](#phase-4-authentication--rich-payloads)
  - [Phase 5: Code Generation & Test Assertions](#phase-5-code-generation--test-assertions)
  - [Phase 6: Multi-Protocol & Batch Collection Runner](#phase-6-multi-protocol--batch-collection-runner)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [🛠️ Architecture](#️-architecture)
- [🚀 Getting Started](#-getting-started)
- [📦 Packaging & Distribution](#-packaging--cross-platform-distribution)
- [🗺️ Project Roadmap](#️-project-roadmap)

---

## ✨ Core Capabilities

### Phase 1: Core Engine & Workbench
- **CORS-Free Native Networking**: Requests execute directly within the Node.js main process, completely bypassing browser CORS restrictions and proxy blocks.
- **Instant cURL Paste & Auto-Import (`cURL` Indicator)**:
  - Paste any raw cURL command directly into the request URL bar (`Ctrl+V` / `⌘V` or input paste).
  - Interceptor automatically detects cURL commands, tokenizes flags and multiline commands (`\` and `^`), and instantly populates the active request:
    - **HTTP Method**: Maps `-X` / `--request` (or `-I` for `HEAD`, `-G` for `GET`). If a payload is provided without an explicit method, automatically defaults to `POST`.
    - **URL & Query Parameters**: Extracts the target endpoint and synchronizes query parameters into the **Params** key-value table.
    - **Headers**: Extracts `-H` / `--header` flags into active entries in the **Headers** editor. Also supports `-A` / `--user-agent`, `-e` / `--referer`, and `-b` / `--cookie`.
    - **Authentication**: Automatically maps `-u` / `--user <user:pass>` to Basic Auth, `--oauth2-bearer <token>` and `Authorization: Bearer <token>` to Bearer Auth, and decodes Base64 `Authorization: Basic <base64>` credentials directly into the **Auth** panel.
    - **Request Body & Payloads**: Formats JSON payloads (`-d`, `--data`, `--data-raw`, `--data-binary`) with 2-space indentation and syntax checks, parses `--data-urlencode` into urlencoded parameters, and maps `-F` / `--form` fields with file path detection (`@filename`) to multipart form-data.
    - **Smart Subtab Focus & Toast Notification**: Automatically activates the relevant workbench subtab (**Body**, **Auth**, or **Headers**) and triggers a non-intrusive confirmation toast.
- **Dynamic Request Workbench**:
  - HTTP method selector (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) with distinctive color badges.
  - Instant URL synchronization: query parameters in the URL synchronize bidirectionally with the **Params** table in real time.
  - **Headers Editor**: Key-value header management with per-header enable/disable checkboxes.
  - **Body Editor**: JSON payload editor with one-click **Prettify** formatting and error detection, plus raw text mode.
- **Deep Response Inspector**:
  - Status pill with color codes (`200 OK`, `404 Not Found`, etc.).
  - Real-time performance metrics (response latency in ms and size in KB/MB).
  - **Pretty** JSON viewer with syntax highlighting and copy-to-clipboard.
  - **Raw** text viewer.
  - **Headers** inspector with real-time search filter.

---

### Phase 2: Collections & Postman Migration
- **Hierarchical Collections & Folders**: Organize APIs into collections and sub-folders with custom descriptions.
- **Collection Management & Safe Deletion**:
  - One-click deletion with a safe in-app confirmation modal (prevents accidental loss of requests).
  - Individual folder and request deletion with confirmation modals.
  - In-place renaming for collections, folders, and requests.
- **Postman v2.1 Import & Export**:
  - One-click import for existing Postman Collections (`.json` v2.0 and v2.1 schemas).
  - Export collections directly to official Postman v2.1 schema or Interceptor JSON format.
- **Save Request Flow (`⌘S` / `Ctrl+S`)**:
  - Save new requests to specific collections and folders.
  - In-place updates for already-saved requests with dirty state (`•`) tab indicators.
- **Native OS Dialogs**: Electron integration with native file open/save dialogs (`dialog.showOpenDialog` & `dialog.showSaveDialog`).

---

### Phase 3: Environments & Dynamic Variables
- **Universal Environment Variables Across the Entire Workbench**:
  - Use `{{variable}}` templates anywhere in your request configuration:
    - **Request Bar**: Full URLs, paths, and query strings (e.g. `{{baseUrl}}/posts/{{postId}}`).
    - **Headers & Query Params**: Key-value tables in both Headers and Params tabs (e.g. `Authorization: Bearer {{apiKey}}`, `X-Tenant-ID: {{tenant}}`).
    - **Authentication**: Bearer tokens (`{{apiKey}}`), Basic Auth username/password (`{{username}}` / `{{password}}`), and API Key name/value.
    - **Request Body**: JSON payloads (e.g. `{"userId": {{userId}}, "token": "{{apiKey}}"}`), raw text, multipart form-data, and `x-www-form-urlencoded` forms.
    - **Test Assertions**: Read and write environment variables programmatically with `interceptor.getEnvironmentVariable("key")`, `interceptor.environment.get("key")`, `pm.environment.get("key")`, and `setEnvironmentVariable`.
- **Interactive On-Hover Resolution Tooltip**:
  - Hovering directly over any `{{variable}}` anywhere across the workbench (Request Bar, Headers, Params, Auth, JSON/Raw Body, and Tests) instantly displays an interactive inspection tooltip.
  - **Live Resolved Value**: Inspect the actual interpolated string with a 1-click **Copy** button.
  - **Resolution Status & Scope**: Color-coded badges for **Resolved** (emerald) vs **Unresolved** (rose with specific error explanations).
  - **Direct Scope & Management**: Shows the active environment name (`Development`, `Globals`, or `Dynamic Generator`) with a direct **Manage** link to configure environments.
  - **Visual Syntax Highlights & Counter**: Variables are framed in amber pill badges, with variable count indicators in the Request Bar and Body Editor.
- **Environment Management**:
  - Create and switch between environments (e.g. `Development`, `Production`, `No Environment`).
  - Active environment switcher directly in the app header bar with live status indicator.
  - Full variable management dialog ([EnvironmentModal.tsx](file:///Users/adarsh/Projects/React/Interceptor/src/components/EnvironmentModal.tsx)) with Key-Value editors and enable/disable toggles.
- **Dynamic Variable Interpolation (`{{variable}}`)**:
  - Interpolates variables across URLs (e.g., `{{baseUrl}}/posts`), query parameters, headers, and request body.
  - Resolves variables right before execution so the exact wire URL and payload are recorded in History.
- **Built-in Dynamic Generators**:
  - `{{$guid}}` / `{{$uuid}}`: Generates unique v4 UUIDs.
  - `{{$timestamp}}`: Current epoch timestamp in milliseconds.
  - `{{$isoTimestamp}}`: Current ISO 8601 formatted timestamp.
  - `{{$randomInt}}`: Random integer between 1 and 1000.

---

### Phase 4: Authentication & Rich Payloads
- **Authentication Helpers**:
  - Dedicated **Auth** workbench tab with visual status badge.
  - **Bearer Token**: Token input with secret toggle, supports `{{apiKey}}` variables, automatically injects `Authorization: Bearer <token>`.
  - **Basic Auth**: Username & password inputs, automatically base64-encoded to `Authorization: Basic <base64>`.
  - **API Key**: Key-value pair with target choice: **Header** or **Query Params**.
- **Advanced Request Payloads**:
  - **JSON**: Formatted with real-time syntax checking & 1-click **Prettify**.
  - **Multipart Form-Data**: Supports key-value fields with Text vs native **File upload** selector.
  - **x-www-form-urlencoded**: Form parameter table with enable/disable checkboxes.
  - **Raw Text**: Plain text payload mode.
  - **Binary File Upload**: Stream/send any file, image, zip, or binary buffer directly.

---

### Phase 5: Code Generation & Test Assertions
- **Code Snippet Generator (`Code` Button)**:
  - Generate ready-to-run code snippets in [CodeSnippetModal.tsx](file:///Users/adarsh/Projects/React/Interceptor/src/components/CodeSnippetModal.tsx).
  - Supported languages and libraries:
    - **cURL**: Shell command with escaped payload flags and headers.
    - **JavaScript (Fetch)**: Modern `fetch` with `async/await` syntax.
    - **JavaScript (Axios)**: `axios` config object.
    - **Python (Requests)**: Script utilizing the popular `requests` library.
    - **Go (`net/http`)**: Native Go boilerplate using `http.NewRequest`.
    - **Dart (`http`)**: Flutter/Dart client code.
  - One-click **Copy Snippet** button with clipboard confirmation.
- **Automated JavaScript Test Assertions (`Tests` Tab)**:
  - Write post-response assertions in [TestScriptEditor.tsx](file:///Users/adarsh/Projects/React/Interceptor/src/components/TestScriptEditor.tsx) that execute immediately upon response arrival.
  - Available sandbox globals:
    - `interceptor.test(name, fn)`: Declares a test case.
    - `interceptor.expect(actual).toBe(expected)`: Value assertion.
    - `interceptor.expect(actual).toEqual(expected)`: Deep object/array equality.
    - `interceptor.expect(actual).toBeLessThan(limit)` / `toBeGreaterThan(limit)`.
    - `interceptor.expect(actual).toContain(substringOrItem)`.
    - `interceptor.expect(actual).toBeTruthy()` / `toBeFalsy()` / `toBeNull()`.
    - `interceptor.getEnvironmentVariable(key)` / `pm.environment.get(key)`: Access active environment variable values in tests.
    - `interceptor.setEnvironmentVariable(key, value)` / `pm.environment.set(key, value)`: Dynamically update active environment variables!
    - `interceptor.replaceVariables(string)`: Interpolate variable templates programmatically.
    - `res`: Access `status`, `statusText`, `timeMs`, `sizeBytes`, `headers`, `data`, `rawBody`, `isJson`.
  - Quick assertion snippet buttons: `Status code is 200`, `Response time < 500ms`, `Response is JSON`, `Body contains text`, `Get Environment Variable`, `Set Environment Variable`.
- **Interactive Test Results Inspector**:
  - Response panel includes a dedicated **Test Results** tab showing passing (green checks) and failing (red X) assertions.
  - Displays descriptive error messages for failing assertions.
- **Save Response to Disk**:
  - One-click **Save** button in the Response bar to save payloads (`.json` or `.txt`) directly to your filesystem.

---

### Phase 6: Multi-Protocol & Batch Collection Runner
- **Real-Time WebSocket Client (`wss://`)**:
  - Dedicated WebSocket tab created via the `+` dropdown in [RequestTabs.tsx](file:///Users/adarsh/Projects/React/Interceptor/src/components/RequestTabs.tsx).
  - Comprehensive workbench in [WebSocketWorkbench.tsx](file:///Users/adarsh/Projects/React/Interceptor/src/components/WebSocketWorkbench.tsx):
    - **Connection Management**: Connect/disconnect from any `ws://` or `wss://` endpoint with visual status dots (Connected, Connecting, Disconnected, Error).
    - **Message Composer**: Compose JSON or text frames with JSON Prettify and sample frames (`Ping Frame`, `Subscribe Action`).
    - **Live Stream Log**: Inspect real-time bidirectional message streams with direction badges (`SENT` vs `RECEIVED`), size in bytes, timestamps, and filter tabs (`All`, `Sent`, `Received`).
- **Newman-Style Batch Collection Runner**:
  - Click the **Play** button on any collection in [CollectionsView.tsx](file:///Users/adarsh/Projects/React/Interceptor/src/components/CollectionsView.tsx) to launch [CollectionRunnerModal.tsx](file:///Users/adarsh/Projects/React/Interceptor/src/components/CollectionRunnerModal.tsx).
  - Configure target environment and delay between requests (ms).
  - Animated live progress bar with active request counter.
  - Executive scorecards: **Total Requests**, **Passed Tests**, **Failed Tests**, and **Total Duration**.
  - Full execution log with per-request latency, status codes, and assertion breakdowns.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘+Enter` / `Ctrl+Enter` | Execute active HTTP request |
| `⌘+S` / `Ctrl+S` | Save request to collection / folder |
| `⌘+T` / `Ctrl+T` | Open a new HTTP request tab |
| `⌘+W` / `Ctrl+W` | Close active tab |

---

## 🛠️ Architecture

```
Interceptor/
├── electron/
│   ├── main.ts         # Main process: window lifecycle, native fetch & CORS-free IPC
│   ├── preload.ts      # Context bridge exposing safe IPC bridge
│   └── tsconfig.json   # TypeScript compilation for Node runtime
├── src/
│   ├── components/     # UI Components
│   │   ├── AuthEditor.tsx            # Bearer, Basic, API Key editors
│   │   ├── BodyEditor.tsx            # JSON, form-data, urlencoded, binary editors
│   │   ├── CodeSnippetModal.tsx      # Multi-language code generator
│   │   ├── CollectionRunnerModal.tsx # Newman-style batch test runner
│   │   ├── CollectionsView.tsx       # Folder tree & collection manager
│   │   ├── EnvironmentModal.tsx      # Environment & variable dialog
│   │   ├── EnvironmentSelector.tsx   # Header environment switcher
│   │   ├── KeyValueEditor.tsx        # Query params & headers editor
│   │   ├── RequestBar.tsx            # Method selector & URL bar
│   │   ├── RequestTabs.tsx           # Multi-tab bar (HTTP & WebSocket)
│   │   ├── ResponseViewer.tsx        # Pretty JSON, raw, headers & test results
│   │   ├── SaveRequestModal.tsx      # Save request to collection modal
│   │   ├── Sidebar.tsx               # Collapsible collections & history panel
│   │   ├── Toast.tsx                 # Non-intrusive action confirmation toasts
│   │   ├── VariableHoverTooltip.tsx  # Interactive environment variable inspector tooltip
│   │   ├── VariableInput.tsx         # Reusable input with syntax pill highlights & variable hover
│   │   └── WebSocketWorkbench.tsx    # WSS client & live stream
│   ├── types/          # TypeScript interfaces (requests, responses, collections, envs)
│   ├── utils/          # Core utilities
│   │   ├── auth.ts                   # Auth resolution and header injection
│   │   ├── codegen.ts                # cURL, JS, Python, Go, Dart snippet generator
│   │   ├── curlParser.ts             # cURL tokenizer and auto-import parser
│   │   ├── http.ts                   # URL parsing, query sync, byte/duration formatters
│   │   ├── postman.ts                # Postman v2.1 import & export serializer
│   │   ├── testRunner.ts             # Sandboxed JavaScript test assertions engine
│   │   └── variables.ts              # {{var}} template substitution & dynamic tokens
│   ├── App.tsx         # Central state orchestration & keyboard shortcuts
│   ├── index.css       # Tailwind CSS v4 styling & dark theme tokens
│   └── main.tsx        # React root entrypoint
├── ROADMAP.md          # Phased roadmap & architectural decisions
├── package.json
└── vite.config.mts     # Vite configuration with @tailwindcss/vite
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### Development Mode (with Live Reload)
```bash
npm run dev
```

### Production Build & Launch
```bash
npm run build
npm start
```

---

## 📦 Packaging & Cross-Platform Distribution

Interceptor uses **`electron-builder`** to produce production-grade standalone executables and installers for **macOS**, **Windows**, and **Linux**.

### Local Builds
```bash
# Build for macOS (.dmg installer and .zip)
npm run dist:mac

# Build for Windows (.exe NSIS installer and portable)
npm run dist:win

# Build for Linux (.AppImage and .deb package)
npm run dist:linux

# Build all targets configured for the current platform
npm run dist:all
```
All generated installers and binaries are output to the `release/` directory.

### Automated Multi-Platform CI/CD (GitHub Actions)
A pre-configured GitHub Actions workflow ([`.github/workflows/build.yml`](./.github/workflows/build.yml)) builds native binaries for macOS, Windows, and Linux in parallel:
```bash
git tag v1.0.0
git push origin v1.0.0
```
This triggers parallel builds across:
- **`macos-latest`**: Generates `.dmg` and `.zip`
- **`windows-latest`**: Generates `.exe` installer and portable executable
- **`ubuntu-latest`**: Generates `.AppImage` and `.deb`
- Automatically attaches all 5 distributable binaries directly to your GitHub Releases page!

---

## 🗺️ Project Roadmap
For architectural details, technical milestones, and future extension ideas, check out [ROADMAP.md](./ROADMAP.md).
