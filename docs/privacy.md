# Privacy Policy

**Browser LLM Chrome Extension**

*Last updated: January 22, 2026*

## Introduction

Browser LLM is an open-source Chrome extension that provides AI-powered text transformations directly in your browser. We are committed to protecting your privacy and being transparent about our data practices.

This privacy policy explains what information the extension accesses, how it is used and what choices you have.

## Information We Collect

### Information You Provide

**API Keys**: If you choose to use cloud-based LLM providers such as OpenRouter, you will need to enter an API key. This key is encrypted using AES-256-GCM encryption and stored locally in your browser. The encryption key is a non-extractable CryptoKey stored in IndexedDB.

**Settings and Preferences**: Your configuration choices are stored locally. This includes your selected provider, model preferences, custom transformation prompts and keyboard shortcuts.

### Information Collected During Use

**Selected Text**: When you explicitly trigger a text transformation by using a keyboard shortcut or context menu, the extension reads the text you have selected. This text is processed only when you initiate the action.

### Information We Do Not Collect

- We do not collect browsing history
- We do not collect personal information
- We do not use analytics or telemetry
- We do not track your activity across websites
- We do not collect any data for advertising purposes

## How We Use Information

**API Keys**: Used solely to authenticate requests with your chosen LLM provider. Keys are decrypted only when making API requests and cached temporarily in session storage. The cache is cleared when you close your browser.

**Selected Text**: Sent to your chosen LLM provider to generate the requested transformation. Text is never stored, logged or transmitted anywhere other than directly to the provider you have configured.

**Settings**: Used to customize the extension behavior according to your preferences. Settings remain on your device.

## Information Sharing

### LLM Providers

When you use Browser LLM with a cloud provider, your selected text and API key are transmitted directly to that provider. These transmissions occur only when you explicitly trigger a transformation.

**OpenRouter**: If you use OpenRouter as your provider, your text is sent directly to openrouter.ai. Your data is subject to the [OpenRouter Privacy Policy](https://openrouter.ai/privacy).

**Ollama (Local)**: If you use Ollama, all processing happens entirely on your local machine. No data leaves your computer.

### No Third Parties

We do not share, sell or transfer your data to any third parties. There is no backend server, no middleman and no data collection infrastructure. All network requests go directly from your browser to your chosen LLM provider.

## Data Storage and Security

### Local Storage Only

All data is stored locally in your browser using Chrome's storage APIs. Nothing is transmitted to us or any server we operate.

### Encryption

API keys are protected using industry-standard encryption:

- **Algorithm**: AES-256-GCM
- **Key Storage**: Non-extractable CryptoKey stored in IndexedDB
- **Session Caching**: Decrypted keys are cached in session storage and automatically cleared when the browser closes

### Data Locations

| Data Type     | Storage Location                 | Encryption               |
| ------------- | -------------------------------- | ------------------------ |
| API Keys      | chrome.storage.local + IndexedDB | AES-256-GCM              |
| Settings      | chrome.storage.sync              | None (no sensitive data) |
| Session Cache | chrome.storage.session           | Cleared on browser close |

## Your Choices

### Managing Your Data

**Clear API Key**: Open the extension popup and clear your API key from the settings.

**Clear All Extension Data**: Go to `chrome://extensions`, find Browser LLM and click "Remove" to delete the extension and all associated data.

**Reset Settings**: Clear your browser's extension storage through Chrome's settings or by removing and reinstalling the extension.

### Choosing Your Provider

You have full control over where your data goes:

- Use **Ollama** for complete local processing with no network requests
- Use **OpenRouter** for cloud processing with direct API calls only

## Chrome Permissions Explained

Browser LLM requests the following permissions:

| Permission                          | Why We Need It                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `storage`                           | Store your encrypted API key, settings and preferences locally in your browser                          |
| `contextMenus`                      | Add a right-click menu so you can access text transformations on any selected text                      |
| `activeTab`                         | Read the text you have selected and display the transformation result as an overlay on the current page |
| `host_permissions: openrouter.ai/*` | Make API calls directly to OpenRouter when you choose it as your provider                               |
| Content scripts on all URLs         | Enable text selection detection and result overlay display on any webpage you visit                     |

We request only the permissions necessary for the extension to function. We do not request permissions for reading browsing history, accessing cookies or any other sensitive data.

## Limited Use Disclosure

Browser LLM's use and transfer of information received from Google APIs adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

Specifically:

1. We only use permissions to provide features visible to you
2. We do not allow humans to read user data unless we have your explicit consent, it is necessary for security purposes or it is required by law
3. We do not use or transfer user data for purposes unrelated to the extension's functionality
4. We do not use or transfer user data to determine creditworthiness or for lending purposes
5. We do not sell user data

## Third-Party Services

When using cloud providers, your data is subject to their privacy policies:

- **OpenRouter**: [https://openrouter.ai/privacy](https://openrouter.ai/privacy)

We recommend reviewing these policies before using cloud-based providers.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted to this page with an updated revision date.

For significant changes, we will update the extension version and you will see the changes when the extension updates.

## Open Source

Browser LLM is open source. You can review the source code to verify our privacy claims:

- **Repository**: [https://github.com/fmdz387/browser-llm-extension](https://github.com/fmdz387/browser-llm-extension)

## Contact

If you have questions about this privacy policy or the extension's data practices:

- **GitHub Issues**: Open an issue in our [repository](https://github.com/fmdz387/browser-llm-extension/issues) 
- **Twitter/X**: [@fmdz387](https://x.com/fmdz387)

---

This privacy policy is effective as of January 22, 2026.
