# Browser LLM - Chrome Extension Implementation Plan

> Chrome extension for local LLM-powered translation, writing assistance, and grammar checking using Ollama.

## Research Summary

### Ollama API (Official Docs)
- **Base URL**: `http://localhost:11434/api`
- **Key Endpoints**:
  - `POST /api/generate` - Text completion
  - `POST /api/chat` - Conversational with messages array
  - `GET /api/tags` - List available models
- **Streaming**: Uses newline-delimited JSON (`application/x-ndjson`), disable with `"stream": false`
- **JS Library**: `ollama` package with browser import via `import ollama from 'ollama/browser'`

### CORS Solution for Chrome Extensions
- Set `OLLAMA_ORIGINS=chrome-extension://*` environment variable on Ollama server
- Add `host_permissions` in manifest: `["http://localhost:*/*", "http://127.0.0.1:*/*"]`
- Make API calls from service worker (background script) to bypass CORS in content scripts

### Chrome Extension Architecture (Manifest V3)
- **Service Worker** (`background.ts`) - API calls, event handling, context menus
- **Content Scripts** - DOM interaction, text selection
- **Popup** - Settings UI
- **Message Passing** - `chrome.runtime.sendMessage`/`onMessage` between components

### Best Practices
- TypeScript with `@types/chrome` for type definitions
- Vite with `@crxjs/vite-plugin` for modern build tooling
- Return `true` for async message handlers
- Register listeners synchronously at top level (MV3 requirement)
- Validate messages from content scripts (security)

**Sources**:
- [Ollama API Introduction](https://docs.ollama.com/api/introduction)
- [Ollama JS Library](https://github.com/ollama/ollama-js)
- [Ollama API Docs on GitHub](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Chrome Extension Cross-Origin Requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Chrome contextMenus API](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Chrome Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [CORS Solution for Ollama Chrome Extension](https://www.mellowtel.com/blog/how-to-solve-cors-ollama-chrome-extension)

---

## Project Structure

```
browser-llm/
├── src/
│   ├── background/
│   │   ├── index.ts              # Service worker entry point
│   │   ├── contextMenu.ts        # Context menu registration
│   │   └── messageHandler.ts     # Message routing
│   │
│   ├── content/
│   │   ├── index.ts              # Content script entry
│   │   ├── textSelection.ts      # Text selection handling
│   │   └── resultOverlay.ts      # Inline result display
│   │
│   ├── popup/
│   │   ├── index.html            # Popup HTML
│   │   ├── index.ts              # Popup logic
│   │   └── styles.css            # Popup styles
│   │
│   ├── services/
│   │   ├── OllamaService.ts      # Core LLM API layer
│   │   ├── TranslationService.ts # Translation prompts/logic
│   │   ├── WritingService.ts     # Writing assistance
│   │   └── GrammarService.ts     # Grammar checking
│   │
│   ├── utils/
│   │   ├── config.ts             # Configuration management
│   │   ├── storage.ts            # Chrome storage wrapper
│   │   ├── messaging.ts          # Type-safe message helpers
│   │   └── errors.ts             # Error types/handling
│   │
│   ├── types/
│   │   ├── messages.ts           # Message protocol types
│   │   ├── ollama.ts             # Ollama API types
│   │   └── config.ts             # Configuration types
│   │
│   └── manifest.json             # Extension manifest
│
├── public/
│   └── icons/                    # Extension icons
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── EXTENSION.md
```

---

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Browser LLM Assistant",
  "version": "1.0.0",
  "description": "Local LLM-powered translation, writing assistance, and grammar checking",

  "permissions": [
    "storage",
    "contextMenus",
    "activeTab"
  ],

  "host_permissions": [
    "http://localhost:*/*",
    "http://127.0.0.1:*/*"
  ],

  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/index.js"],
      "css": ["content/styles.css"]
    }
  ],

  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

---

## Core Components

### 1. OllamaService (Reusable LLM Layer)

**File**: `src/services/OllamaService.ts`

```typescript
interface OllamaConfig {
  host: string;
  port: number;
  defaultModel: string;
  defaultOptions: {
    temperature?: number;
    top_p?: number;
  };
}

class OllamaService {
  constructor(config?: Partial<OllamaConfig>);

  // Connection
  testConnection(): Promise<Result<boolean>>;
  listModels(): Promise<Result<OllamaTagsResponse>>;

  // Generation
  generate(prompt: string, options?: GenerateOptions): Promise<Result<GenerateResponse>>;
  generateStream(prompt: string, onChunk: ChunkCallback, options?: GenerateOptions): Promise<Result<void>>;

  // Chat
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<Result<ChatResponse>>;

  // Control
  updateConfig(config: Partial<OllamaConfig>): void;
  cancelRequest(): void;
}
```

**Key Features**:
- Configurable host/port/model/temperature
- Non-streaming and streaming support
- AbortController for request cancellation
- Result type pattern for error handling
- Singleton pattern for service worker

### 2. Feature Services

**TranslationService** (`src/services/TranslationService.ts`):
```typescript
interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

function translate(request: TranslationRequest): Promise<Result<TranslationResult>>;
```

**WritingService** (`src/services/WritingService.ts`):
```typescript
type WritingAction = 'improve' | 'simplify' | 'expand' | 'summarize' | 'rephrase';
type WritingStyle = 'formal' | 'casual' | 'professional' | 'academic' | 'creative';

function assistWriting(request: WritingRequest): Promise<Result<WritingResult>>;
```

**GrammarService** (`src/services/GrammarService.ts`):
```typescript
interface GrammarRequest {
  text: string;
  includeExplanations?: boolean;
}

function checkGrammar(request: GrammarRequest): Promise<Result<GrammarResult>>;
```

### 3. Message Protocol

**Types** (`src/types/messages.ts`):
```typescript
// Request types (content script/popup -> background)
type ExtensionRequest =
  | { type: 'TRANSLATE'; payload: TranslatePayload }
  | { type: 'WRITING_ASSIST'; payload: WritingPayload }
  | { type: 'GRAMMAR_CHECK'; payload: GrammarPayload }
  | { type: 'GET_CONFIG' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<ExtensionConfig> }
  | { type: 'LIST_MODELS' }
  | { type: 'TEST_CONNECTION' }
  | { type: 'CANCEL_REQUEST' };

// Response type
type ExtensionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Context menu action (background -> content script)
interface ContextMenuAction {
  type: 'CONTEXT_MENU_ACTION';
  action: 'translate' | 'improve' | 'grammar';
}
```

**Messaging Utility** (`src/utils/messaging.ts`):
```typescript
function sendToBackground<T>(message: ExtensionRequest): Promise<ExtensionResponse<T>>;
function sendToTab<T>(tabId: number, message: unknown): Promise<T | undefined>;
```

### 4. Context Menu Integration

**File**: `src/background/contextMenu.ts`

```typescript
// Menu items
const MENU_ITEMS = [
  { id: 'browser-llm-translate', title: 'Translate Selection', action: 'translate' },
  { id: 'browser-llm-improve', title: 'Improve Writing', action: 'improve' },
  { id: 'browser-llm-grammar', title: 'Check Grammar', action: 'grammar' }
];

// Register on install
function registerContextMenus(): void;

// Handle clicks
function handleContextMenuClick(info: OnClickData, tab: Tab): void;
```

### 5. Content Script Components

**TextSelectionHandler** (`src/content/textSelection.ts`):
- Captures text selection on mouseup/keyup
- Stores selection rect for overlay positioning
- Methods: `getSelectedText()`, `getSelectionRect()`, `clearSelection()`

**ResultOverlay** (`src/content/resultOverlay.ts`):
- Shadow DOM for style isolation
- Shows loading state, results, errors
- Copy and Replace buttons
- Positions below selected text

### 6. Configuration Management

**File**: `src/utils/config.ts`

```typescript
interface ExtensionConfig {
  ollama: {
    host: string;
    port: number;
    model: string;
    temperature: number;
  };
  translation: {
    defaultTargetLanguage: string;
  };
  writing: {
    defaultStyle: string;
  };
  ui: {
    showFloatingButton: boolean;
    resultPosition: 'overlay' | 'sidebar' | 'popup';
  };
}

// Functions
function getConfig(): Promise<ExtensionConfig>;
function updateConfig(partial: Partial<ExtensionConfig>): Promise<void>;
function resetConfig(): Promise<void>;
```

Uses `chrome.storage.sync` for cross-device persistence.

---

## Build Configuration

### Vite Setup (Recommended)

**Why Vite over Webpack**:
- Faster dev builds with ES modules
- Simpler configuration
- Better TypeScript support
- Built-in production optimizations

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development'
  }
});
```

**package.json scripts**:
```json
{
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "tsc && vite build",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  }
}
```

**Dependencies**:
```json
{
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.25",
    "@types/chrome": "^0.0.260",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.4.0"
  }
}
```

---

## Error Handling Strategy

```typescript
// Result type pattern
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: OllamaError };

// Error codes
enum OllamaErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// Utilities
function handleError(error: unknown): { code: string; message: string };
function withRetry<T>(operation: () => Promise<T>, maxRetries?: number): Promise<T>;
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize Vite + TypeScript project
- [ ] Create manifest.json with permissions
- [ ] Implement `OllamaService` with connection test
- [ ] Set up message passing infrastructure
- [ ] Create configuration management

### Phase 2: Core Services
- [ ] Implement `TranslationService`
- [ ] Implement `WritingService`
- [ ] Implement `GrammarService`
- [ ] Add comprehensive error handling
- [ ] Write unit tests for services

### Phase 3: UI Components
- [ ] Build content script with text selection
- [ ] Create result overlay component
- [ ] Implement context menu integration
- [ ] Build popup settings UI
- [ ] Style all components

### Phase 4: Integration
- [ ] Connect all components via messaging
- [ ] Implement streaming support (optional)
- [ ] Add connection status indicators
- [ ] Handle edge cases
- [ ] End-to-end testing

### Phase 5: Polish
- [ ] Performance optimization
- [ ] Accessibility review
- [ ] Production build optimization
- [ ] Final testing

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/services/OllamaService.ts` | Core LLM API layer - all features depend on this |
| `src/background/messageHandler.ts` | Central message router connecting components |
| `src/types/messages.ts` | Message protocol interfaces |
| `src/content/index.ts` | Content script entry handling UI |
| `vite.config.ts` | Build configuration for extension |

---

## Ollama Server Setup

Before using the extension, configure Ollama to accept requests from Chrome extensions:

**Windows** (Environment Variables):
```
OLLAMA_ORIGINS=chrome-extension://*
```

**Linux/macOS**:
```bash
OLLAMA_ORIGINS=chrome-extension://* ollama serve
```

**Docker**:
```bash
docker run -d -p 11434:11434 -e OLLAMA_ORIGINS="chrome-extension://*" ollama/ollama
```

---

## Verification Plan

1. **Build Verification**:
   - Run `npm run build` - should produce `dist/` folder with manifest, scripts, and assets
   - Run `npm run type-check` - no TypeScript errors

2. **Extension Loading**:
   - Load unpacked extension from `dist/` in Chrome
   - Verify popup opens with settings UI
   - Check service worker loads (DevTools > Extensions)

3. **Functional Testing**:
   - Test connection to Ollama (popup shows "Connected")
   - Select text on any webpage
   - Right-click > Browser LLM > Translate/Improve/Grammar
   - Verify overlay appears with result

4. **Error Handling**:
   - Stop Ollama server - verify "Disconnected" status and friendly error
   - Select invalid model - verify appropriate error message

---

# UI & State Management Architecture

> Based on patterns from zods-extension reference project and 2025 best practices research.

## Reference Project Stack (zods-extension)

The reference project uses:
- **React 19.0.0** with functional components and hooks
- **Vite 6** with `@vitejs/plugin-react`
- **shadcn/ui** components built on Radix UI
- **Tailwind CSS 3.4** with tailwindcss-animate
- **Lucide React** for icons
- **Shadow DOM** for content script style isolation
- Path aliases: `@`, `@components`, `@utils`

**Sources**:
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [zustand-chrome-storage](https://github.com/brokeboiflex/zustand-chrome-storage)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Sonner Toast](https://ui.shadcn.com/docs/components/sonner)
- [LLM Streaming Best Practices](https://dev.to/hobbada/the-complete-guide-to-streaming-llm-responses-in-web-applications-from-sse-to-real-time-ui-3534)
- [Shadow DOM for Chrome Extensions](https://dev.to/developertom01/solving-css-and-javascript-interference-in-chrome-extensions-a-guide-to-react-shadow-dom-and-best-practices-9l)

---

## Updated Project Structure

```
browser-llm/
├── src/
│   ├── background/
│   │   ├── index.ts                    # Service worker entry point
│   │   ├── contextMenu.ts              # Context menu registration
│   │   ├── messageHandler.ts           # Message routing
│   │   └── ollamaHandler.ts            # Ollama API calls + streaming
│   │
│   ├── content/
│   │   ├── index.tsx                   # Content script entry (React mount)
│   │   ├── App.tsx                     # Main content script React app
│   │   ├── ResultOverlay.tsx           # Floating result overlay
│   │   ├── SelectionHandler.tsx        # Text selection logic
│   │   └── styles/
│   │       └── content.css             # Content script base styles
│   │
│   ├── popup/
│   │   ├── index.html                  # Popup HTML entry
│   │   ├── index.tsx                   # Popup React entry
│   │   ├── App.tsx                     # Popup main component
│   │   └── pages/
│   │       └── Settings.tsx            # Settings panel
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── scroll-area.tsx
│   │   │
│   │   ├── features/                   # Feature-specific components
│   │   │   ├── ConnectionStatus.tsx    # Ollama connection indicator
│   │   │   ├── ModelSelector.tsx       # Model dropdown with status
│   │   │   ├── StreamingText.tsx       # Token-by-token text display
│   │   │   ├── ActionButtons.tsx       # Copy, Replace, Retry buttons
│   │   │   ├── ErrorDisplay.tsx        # Error state with recovery
│   │   │   └── LoadingState.tsx        # Skeleton/spinner states
│   │   │
│   │   └── shared/
│   │       └── Toast.tsx               # Sonner toast wrapper
│   │
│   ├── store/                          # Zustand state management
│   │   ├── index.ts                    # Store exports
│   │   ├── useConfigStore.ts           # Configuration slice
│   │   ├── useConnectionStore.ts       # Connection status slice
│   │   ├── useRequestStore.ts          # Active request slice
│   │   └── middleware/
│   │       └── chromeStorage.ts        # chrome.storage persistence
│   │
│   ├── hooks/                          # Custom React hooks
│   │   ├── useStreamingResponse.ts     # Streaming text hook
│   │   ├── useSelection.ts             # Text selection hook
│   │   ├── useOverlayPosition.ts       # Overlay positioning hook
│   │   ├── useKeyboardShortcuts.ts     # Keyboard navigation
│   │   └── useHydration.ts             # Store hydration state
│   │
│   ├── lib/
│   │   └── utils.ts                    # cn() utility function
│   │
│   ├── services/
│   ├── utils/
│   ├── types/
│   └── manifest.json
│
├── components.json                     # shadcn/ui configuration
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## State Management with Zustand

### Why Zustand (Not Redux)
- **Minimal boilerplate** - ~3kb bundle size
- **Chrome extension friendly** - Works with `chrome.storage` via middleware
- **Simple async hydration** - Handles storage loading gracefully
- **No Provider wrapper needed** - Simpler component tree

### Store Architecture

#### Configuration Store
```typescript
// src/store/useConfigStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chromeStorageAdapter } from './middleware/chromeStorage';

interface OllamaConfig {
  host: string;           // default: 'localhost'
  port: number;           // default: 11434
  model: string;          // default: '' (auto-detect)
  temperature: number;    // default: 0.7
  maxTokens: number;      // default: 2048
}

interface ConfigState {
  ollama: OllamaConfig;
  translation: { defaultTargetLanguage: string };
  writing: { defaultStyle: string; defaultAction: string };
  ui: { theme: 'dark' | 'light' | 'system' };

  updateOllama: (config: Partial<OllamaConfig>) => void;
  resetToDefaults: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ollama: { host: 'localhost', port: 11434, model: '', temperature: 0.7, maxTokens: 2048 },
      translation: { defaultTargetLanguage: 'en' },
      writing: { defaultStyle: 'professional', defaultAction: 'improve' },
      ui: { theme: 'dark' },

      updateOllama: (config) => set((state) => ({
        ollama: { ...state.ollama, ...config }
      })),
      resetToDefaults: () => set({ /* defaults */ }),
    }),
    {
      name: 'browser-llm-config',
      storage: chromeStorageAdapter,  // Uses chrome.storage.sync
    }
  )
);
```

#### Connection Store
```typescript
// src/store/useConnectionStore.ts
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConnectionState {
  status: ConnectionStatus;
  error: string | null;
  availableModels: Array<{ name: string; size: string }>;

  checkConnection: () => Promise<void>;
  setModels: (models: Array<{ name: string; size: string }>) => void;
}
```

#### Request Store (for streaming UI)
```typescript
// src/store/useRequestStore.ts
type RequestStatus = 'idle' | 'pending' | 'streaming' | 'completed' | 'error' | 'cancelled';
type RequestType = 'translate' | 'improve' | 'simplify' | 'grammar';

interface ActiveRequest {
  id: string;
  type: RequestType;
  inputText: string;
  outputText: string;         // Accumulates streamed tokens
  status: RequestStatus;
  tokensGenerated: number;
  startTime: number;
  error: string | null;
}

interface RequestState {
  current: ActiveRequest | null;

  startRequest: (type: RequestType, inputText: string) => string;
  appendToken: (token: string) => void;  // For streaming
  completeRequest: () => void;
  failRequest: (error: string) => void;
  cancelRequest: () => void;
}
```

### Chrome Storage Middleware
```typescript
// src/store/middleware/chromeStorage.ts
import type { StateStorage } from 'zustand/middleware';

export const chromeStorageAdapter: StateStorage = {
  getItem: async (name) => {
    try {
      const result = await chrome.storage.sync.get(name);
      return result[name] ?? null;
    } catch {
      return localStorage.getItem(name);  // Fallback for dev
    }
  },
  setItem: async (name, value) => {
    try {
      await chrome.storage.sync.set({ [name]: value });
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await chrome.storage.sync.remove(name);
    } catch {
      localStorage.removeItem(name);
    }
  },
};
```

### Hydration Hook
```typescript
// src/hooks/useHydration.ts
import { useEffect, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore';

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useConfigStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    if (useConfigStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return unsubscribe;
  }, []);

  return isHydrated;
}
```

---

## Streaming Response UX

### Key UX Principles
- **TTFT < 300-700ms** - Time To First Token feels snappy
- **Token batching** - Render every 30-60ms to avoid reflow storms
- **Typing cursor** - Visual feedback during streaming
- **Cancel support** - Escape key aborts generation

### Streaming Hook
```typescript
// src/hooks/useStreamingResponse.ts
export function useStreamingResponse(batchInterval = 40) {
  const { startRequest, appendToken, completeRequest, failRequest } = useRequestStore();
  const tokenBuffer = useRef<string>('');
  const flushTimer = useRef<NodeJS.Timeout | null>(null);

  // Batch token updates to prevent reflow storms
  const bufferToken = useCallback((token: string) => {
    tokenBuffer.current += token;

    if (!flushTimer.current) {
      flushTimer.current = setTimeout(() => {
        appendToken(tokenBuffer.current);
        tokenBuffer.current = '';
        flushTimer.current = null;
      }, batchInterval);
    }
  }, [batchInterval, appendToken]);

  const execute = useCallback(async (type: RequestType, inputText: string) => {
    const requestId = startRequest(type, inputText);

    // Listen for streaming tokens from background
    const handleMessage = (message: any) => {
      if (message.requestId !== requestId) return;

      if (message.type === 'STREAM_TOKEN') bufferToken(message.token);
      if (message.type === 'STREAM_COMPLETE') completeRequest();
      if (message.type === 'STREAM_ERROR') failRequest(message.error);
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    await sendToBackground({ type: 'GENERATE_STREAM', payload: { ... } });
  }, []);

  return { execute };
}
```

### StreamingText Component
```typescript
// src/components/features/StreamingText.tsx
export const StreamingText: React.FC<{ text: string; isStreaming: boolean }> = ({
  text,
  isStreaming,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming (throttled to 50ms)
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text, isStreaming]);

  return (
    <div ref={containerRef} className="text-sm leading-relaxed whitespace-pre-wrap">
      {text}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse" />
      )}
    </div>
  );
};
```

---

## UI Components

### Popup Settings (~380px width)

**Design Constraints**:
- Max popup size: 800x600px
- Recommended: 350-400px width for settings
- Min font size: 14px for accessibility
- Use Cards to group related settings

**Sections**:
1. Header with ConnectionStatus badge
2. Ollama Connection (host, port, model, temperature)
3. Translation (target language, auto-detect toggle)
4. Interface (theme toggle)
5. Reset to Defaults button

### Result Overlay (Content Script)

**Features**:
- **Shadow DOM** for style isolation
- **Floating positioning** relative to selection
- **Viewport-aware** - repositions near edges
- **Keyboard accessible** - Escape to close/cancel

```typescript
// src/content/ResultOverlay.tsx
export const ResultOverlay: React.FC<{
  selectionRect: DOMRect | null;
  onClose: () => void;
  onReplace: (text: string) => void;
}> = ({ selectionRect, onClose, onReplace }) => {
  const { current: request, cancelRequest } = useRequestStore();
  const position = useOverlayPosition(selectionRect);

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        request?.status === 'streaming' ? cancelRequest() : onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [request?.status]);

  return (
    <div
      className="fixed z-[99999] w-[400px] max-w-[90vw] bg-popover border rounded-lg shadow-lg p-4"
      style={{ left: position.x, top: position.y }}
      role="dialog"
      aria-labelledby="result-title"
    >
      {/* Header, StreamingText, ActionButtons, Status */}
    </div>
  );
};
```

### Component Library (shadcn/ui)

Install these components:
```bash
npx shadcn@latest add button input select skeleton slider switch label card badge separator tooltip scroll-area
```

Additional packages:
- `sonner` - Toast notifications
- `lucide-react` - Icons

---

## Shadow DOM Setup for Content Script

```typescript
// src/content/index.tsx
function createShadowContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'browser-llm-root';
  container.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 0; height: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;

  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Inject styles
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('content/styles.css');
  shadowRoot.appendChild(styleLink);

  // CSS variables for shadcn/ui
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    :host { all: initial; font-family: system-ui, sans-serif; }
    .dark {
      --background: 240 10% 3.9%;
      --foreground: 0 0% 98%;
      --popover: 240 10% 3.9%;
      --primary: 0 0% 98%;
      /* ... other CSS variables */
    }
  `;
  shadowRoot.appendChild(styleElement);

  // Render target
  const renderTarget = document.createElement('div');
  renderTarget.className = 'dark';
  renderTarget.style.pointerEvents = 'auto';
  shadowRoot.appendChild(renderTarget);

  document.body.appendChild(container);
  return renderTarget;
}
```

---

## Accessibility & Edge Cases

### Keyboard Navigation
```typescript
// src/hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in inputs (except Escape)
      const target = e.target as HTMLElement;
      if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && e.key !== 'Escape') {
        return;
      }

      const handler = shortcuts[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

### Overlay Positioning
```typescript
// src/hooks/useOverlayPosition.ts
const VIEWPORT_PADDING = 16;

export function useOverlayPosition(selectionRect: DOMRect | null) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!selectionRect) return;

    let x = selectionRect.left;
    let y = selectionRect.bottom + 8;

    // Adjust if going off right edge
    if (x + 400 > window.innerWidth - VIEWPORT_PADDING) {
      x = window.innerWidth - 400 - VIEWPORT_PADDING;
    }

    // Show above selection if would go below viewport
    if (y + 200 > window.innerHeight - VIEWPORT_PADDING) {
      y = selectionRect.top - 200 - 8;
    }

    setPosition({ x: Math.max(VIEWPORT_PADDING, x), y: Math.max(VIEWPORT_PADDING, y) });
  }, [selectionRect]);

  return position;
}
```

### Selection in Editable Fields
```typescript
// src/hooks/useSelection.ts
export function useSelection() {
  const replaceSelection = useCallback((newText: string) => {
    const sel = window.getSelection();
    const activeElement = document.activeElement as HTMLElement;

    // Handle input/textarea
    if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
      const input = activeElement as HTMLInputElement;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;

      input.value = input.value.slice(0, start) + newText + input.value.slice(end);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // Handle contentEditable
    if (activeElement?.isContentEditable) {
      document.execCommand('insertText', false, newText);
      return true;
    }

    // Non-editable: copy to clipboard
    navigator.clipboard.writeText(newText);
    return false;
  }, []);

  return { replaceSelection };
}
```

### Screen Reader Support
```typescript
// Add aria-live region for streaming updates
<div role="status" aria-live="polite" className="sr-only">
  {status === 'streaming' && 'Generating response...'}
  {status === 'completed' && `Response complete: ${outputText}`}
  {status === 'error' && `Error: ${error}`}
</div>
```

---

## Updated Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-switch": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "lucide-react": "^0.473.0",
    "sonner": "^1.7.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "@types/chrome": "^0.0.297",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.0.0"
  }
}
```

---

## Updated Implementation Phases

### Phase 3: UI Components (Detailed)
- [ ] Set up React + Vite for popup and content script
- [ ] Configure Tailwind CSS + shadcn/ui
- [ ] Install shadcn components (button, input, select, skeleton, etc.)
- [ ] Implement Zustand stores with chrome.storage middleware
- [ ] Create ConnectionStatus component
- [ ] Create ModelSelector component
- [ ] Build popup Settings page (~380px width)
- [ ] Create Shadow DOM container for content script
- [ ] Build ResultOverlay with streaming support
- [ ] Implement StreamingText with cursor animation
- [ ] Add ActionButtons (Copy, Replace, Cancel)
- [ ] Integrate Sonner for toast notifications

### Phase 4: Integration (Detailed)
- [ ] Connect stores across popup/content/background contexts
- [ ] Implement streaming token handler in background
- [ ] Wire up useStreamingResponse hook with batching
- [ ] Add keyboard shortcuts (Escape to cancel)
- [ ] Test overlay positioning at viewport edges
- [ ] Handle selection replacement in inputs/contentEditable
- [ ] Add screen reader announcements (aria-live)
- [ ] Test with various websites (iframes, SPAs)

---

## Critical UI Files

| File | Purpose |
|------|---------|
| `src/store/useConfigStore.ts` | Config state with chrome.storage persistence |
| `src/store/useRequestStore.ts` | Active request state for streaming UI |
| `src/content/ResultOverlay.tsx` | Main overlay component in Shadow DOM |
| `src/components/features/StreamingText.tsx` | Token-by-token display with cursor |
| `src/hooks/useStreamingResponse.ts` | Streaming orchestration with 40ms batching |
| `src/popup/pages/Settings.tsx` | Full settings panel UI |
| `src/content/index.tsx` | Shadow DOM setup and React mount |
