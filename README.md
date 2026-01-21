# Browser LLM

<p align="center">
  <img src="assets/512x512.png" alt="Browser LLM" width="128" height="128">
</p>

Privacy-first AI toolkit for the browser. Open-source, lightweight text transformations with extensible prompts. No backend—direct API calls only. Local (Ollama) + cloud provider support.

## Privacy

**No backend server. No middleman. Direct API calls only.**

All requests are made directly from your browser to your chosen LLM provider. There is no proxy server, no data collection and no telemetry. Your API keys and data never pass through any third-party infrastructure.

- **Ollama**: Requests stay entirely on your local machine
- **OpenRouter/OpenAI/Anthropic**: Requests go directly from your browser to the provider's API

## Features

### Text Transformations
- **Predefined transformations**: Translate to English, Fix Grammar and Make Concise, ready to use out of the box
- **Custom transformations**: Create unlimited custom transformations with your own prompts and instructions
- **Enable/disable transformations**: Toggle individual transformations on or off to customize your context menu
- **Reorder transformations**: Arrange transformations in your preferred order

### LLM Providers

| Provider       | Status      | Description                                                    |
| -------------- | ----------- | -------------------------------------------------------------- |
| **Ollama**     | Available   | Run models locally with complete privacy. No API key required. |
| **OpenRouter** | Available   | Access 100+ models through a single API. Pay-per-use pricing.  |
| **OpenAI**     | Coming Soon | Direct integration with GPT models.                            |
| **Anthropic**  | Coming Soon | Direct integration with Claude models.                         |

### User Experience
- **Keyboard shortcuts**: Default `Alt+T/C/G` shortcuts, fully customizable
- **Context menu integration**: Right-click any selected text to access transformations
- **Inline overlay**: Results appear in a floating overlay near your selection
- **Copy or replace**: One-click to copy the result or replace the original text
- **Secure API key storage**: API keys are encrypted before being stored locally

## Installation

**Chrome Web Store**: Coming soon

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/browser-llm.git
cd browser-llm

# Install dependencies
pnpm install

# Build the extension
pnpm build

# For production build (minified)
pnpm build:prod
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `dist` folder from the project directory
5. The extension icon should appear in your toolbar

## Provider Setup

### Ollama (Local)

[Ollama](https://ollama.com/) lets you run LLMs locally on your machine. No API key needed, complete privacy.

1. Install Ollama from [ollama.com](https://ollama.com/)
2. Pull a model: `ollama pull gpt-oss:20b` (or any model you prefer)
3. Configure CORS to allow browser extension requests (see below)
4. In the extension popup, select Ollama and configure host/port (default: `localhost:11434`)

#### CORS Configuration

Ollama server requires CORS headers to set Chrome extension origin as allowed. 

Set the `OLLAMA_ORIGINS` environment variable:

**macOS / Linux (temporary, current session):**
```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

**macOS / Linux (permanent):**
```bash
# Add to ~/.bashrc, ~/.zshrc, or equivalent
export OLLAMA_ORIGINS="chrome-extension://*"
```

Then restart your terminal or run `source ~/.bashrc` (or `~/.zshrc`).

**Windows (temporary, current session - PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="chrome-extension://*"
ollama serve
```

**Windows (permanent - System Environment Variable):**
1. Open **Settings** > **System** > **About** > **Advanced system settings**
2. Click **Environment Variables**
3. Under **User variables**, click **New**
4. Variable name: `OLLAMA_ORIGINS`
5. Variable value: `chrome-extension://*`
6. Click **OK** and restart Ollama

**Windows (permanent - PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "chrome-extension://*", "User")
```

Restart Ollama after setting the environment variable.

### OpenRouter

[OpenRouter](https://openrouter.ai/) provides access to multiple LLM providers through a single API.

1. Create an account at [openrouter.ai](https://openrouter.ai/)
2. Generate an API key from your dashboard
3. In the extension popup, select OpenRouter and enter your API key
4. Choose from preset models or enter a custom model ID

### OpenAI (Coming Soon)

Direct integration with OpenAI's GPT models will be available in a future release.

### Anthropic (Coming Soon)

Direct integration with Anthropic's Claude models will be available in a future release.

## Usage

1. **Configure your provider**: Click the extension icon and set up your preferred LLM provider
2. **Select text**: Highlight any text on a webpage
3. **Transform**: Use a keyboard shortcut or right-click and choose from the **Browser LLM** submenu
4. **Apply**: Click **Copy** to copy the result or **Replace** to replace the original text

### Keyboard Shortcuts

Select text and press a shortcut to instantly transform it.

| Shortcut | Action               | Mac  |
| -------- | -------------------- | ---- |
| `Alt+T`  | Translate to English | `⌥T` |
| `Alt+C`  | Make Concise         | `⌥C` |
| `Alt+G`  | Fix Grammar          | `⌥G` |

Shortcuts work in regular text, input fields, textareas and contenteditable elements.

**Configuring shortcuts:**

1. Click the extension icon to open the popup
2. Scroll to the **Keyboard Shortcuts** section
3. Click on any shortcut field and press your desired key combination
4. Shortcuts require at least one modifier key (Alt, Ctrl, Shift, or Cmd)

**Adding shortcuts for custom transformations:**

1. Create your custom transformation in the **Transformations** section
2. In **Keyboard Shortcuts**, click **Add Shortcut**
3. Select your transformation from the dropdown
4. Record your preferred key combination

### Managing Transformations

In the extension popup, you can:
- Toggle transformations on/off with the switch
- Edit transformation names and prompts
- Create new custom transformations
- Delete transformations you no longer need

## Development

```bash
# Start development server with hot reload
pnpm dev

# Run type checking
pnpm typecheck

# Run linter
pnpm lint

# Run tests
pnpm test
```

## Tech Stack

- **React 19** - UI components
- **TypeScript** - Type safety
- **Vite** - Build tooling
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Radix UI** - Accessible UI primitives
- **Chrome Extension APIs** - Manifest V3

## Author

[![@fmdz387 on X](https://img.shields.io/badge/-@fmdz387-black?logo=x)](https://x.com/fmdz387)

## License

MIT
