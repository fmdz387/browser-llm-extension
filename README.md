# Browser LLM

<p align="center">
  <img src="assets/512x512.png" alt="Browser LLM" width="128" height="128">
</p>

Privacy-first AI toolkit for the browser. Open-source, lightweight text transformations with extensible prompts and AI image text extraction (OCR). No backend - direct API calls only. Local (Ollama) + cloud provider support.

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

### AI Image Text Extraction (OCR)
- **Extract text from any image**: Right-click on any image and select "Extract Text (OCR)" to extract text using AI vision
- **Powered by Gemini Flash**: Uses Google's Gemini 3 Flash model via OpenRouter for fast, accurate text extraction
- **Works with any image**: Screenshots, photos, documents, diagrams - any image containing text

### LLM Providers

| Provider       | Status      | Description                                                    |
| -------------- | ----------- | -------------------------------------------------------------- |
| **Ollama**     | Available   | Run models locally with complete privacy. No API key required. |
| **OpenRouter** | Available   | Access 100+ models through a single API. Pay-per-use pricing.  |
| **OpenAI**     | Coming Soon | Direct integration with GPT models.                            |
| **Anthropic**  | Coming Soon | Direct integration with Claude models.                         |

### User Experience
- **Keyboard shortcuts**: Default `Ctrl+Shift+T/C/G` (auto-rebinds to `⌘⇧T/C/G` on macOS), fully customizable
- **Context menu integration**: Right-click any selected text to access transformations, or right-click images for OCR
- **Inline overlay**: Results appear in a floating overlay near your selection
- **Copy or replace**: One-click to copy the result or replace the original text
- **Secure API key storage**: API keys are encrypted before being stored locally
- **Cross-platform**: macOS, Windows, and Linux support with platform-aware shortcuts

## Installation

[Go to Chrome Web Store](https://chromewebstore.google.com/detail/browser-llm/ajogehgpdbbljibfapffbehkjmgokale)

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

Ollama needs to allow the Chrome extension origin. Set the `OLLAMA_ORIGINS` environment variable.

**Which instructions apply to you?** The official **Ollama.app** for macOS (installed from [ollama.com](https://ollama.com/)) is launched by `launchd` and does **not** inherit environment variables from your shell — adding `export` to `~/.zshrc` will not work. Use the `launchctl` instructions below. If you start `ollama serve` manually from Terminal, you can use the shell-env approach.

##### macOS — Ollama.app (recommended)

```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
```

Then **quit Ollama from the menu bar** (click the icon → Quit) and relaunch it. The value persists across reboots while you're logged in.

Recent Ollama versions also expose this in the menu-bar **Settings** UI — set the *Allowed origins* field to `chrome-extension://*` and click Apply.

##### macOS / Linux — `ollama serve` from the terminal

Temporary (current session):
```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

Persistent (add to your shell profile):
```bash
# ~/.zshrc or ~/.bashrc
export OLLAMA_ORIGINS="chrome-extension://*"
```
Then `source ~/.zshrc` (or restart your terminal) and start `ollama serve`.

##### Windows — temporary (PowerShell)
```powershell
$env:OLLAMA_ORIGINS="chrome-extension://*"
ollama serve
```

##### Windows — permanent (System Environment Variable)
1. Open **Settings** → **System** → **About** → **Advanced system settings**
2. Click **Environment Variables**
3. Under **User variables**, click **New**
4. Variable name: `OLLAMA_ORIGINS`
5. Variable value: `chrome-extension://*`
6. Click **OK** and restart Ollama

##### Windows — permanent (PowerShell)
```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "chrome-extension://*", "User")
```
Restart Ollama after setting the variable.

##### Troubleshooting

- **"Connected" toggles to "Error" sporadically on macOS** — Chrome may resolve `localhost` over IPv6 (`::1`) while Ollama only binds to IPv4. Change the host in the extension popup from `localhost` to `127.0.0.1`.
- **Still seeing CORS errors after `launchctl setenv`** — Make sure you fully quit Ollama (menu bar → Quit, not just closed the window) before relaunching. `launchctl setenv` only affects processes started **after** the command runs.

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

### Extracting Text from Images - Optical Character Recognition (OCR)

1. **Right-click on any image** on a webpage
2. Select **Extract Text (OCR)** from the context menu
3. The extracted text appears in an overlay near the image

OCR uses Gemini 3 Flash via OpenRouter, so an OpenRouter API key is required for this feature.

### Keyboard Shortcuts

Select text and press a shortcut to instantly transform it.

| Action                     | Windows / Linux    | macOS    |
| -------------------------- | ------------------ | -------- |
| Translate to English       | `Ctrl + Shift + T` | `⌃ ⌘ T` |
| Fix Grammar                | `Ctrl + Shift + G` | `⌃ ⌘ G` |
| Translate to Urban English | `Ctrl + Shift + U` | `⌃ ⌘ U` |
| Open settings popup        | `Ctrl + Shift + L` | `⌘ ⇧ L` |

Shortcuts work in regular text, input fields, textareas and contenteditable elements. The settings shortcut (`⌘⇧L` / `Ctrl+Shift+L`) is registered with Chrome and works everywhere — including `chrome://` pages and the New Tab page.

**Configuring shortcuts:**

1. Click the extension icon to open the popup
2. Scroll to the **Keyboard Shortcuts** section
3. Click on any shortcut field and press your desired key combination
4. Shortcuts require at least one modifier key
   - macOS: Command (⌘), Control (⌃), Option (⌥), or Shift (⇧)
   - Windows / Linux: Ctrl, Alt, Shift, or Win

**Why these defaults?** On macOS, Option+letter is a dead-key combination that types accented characters (⌥T → `†`, ⌥C → `ç`), so the Mac defaults use `Control+Command+letter` — the standard "utility" modifier pattern that doesn't collide with single-Cmd app shortcuts (⌘C, ⌘V, ⌘S) and never produces composed characters. On Windows/Linux the defaults use `Ctrl+Shift+letter`, the conventional secondary-action modifier.

**Binding shortcuts that fire on `chrome://` pages and PDFs:**

Open `chrome://extensions/shortcuts` (paste in the address bar) and assign keys to the *Translate selected text*, *Fix grammar in selected text*, *Translate selected text to urban English*, and *Make selected text concise* commands. These integrate with Chrome's native shortcut system — useful on restricted pages where content scripts cannot inject. Note: the transformation overlay still requires a regular webpage to display the result.

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
