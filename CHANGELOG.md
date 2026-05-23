# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - macOS readiness, new model lineup, Urban English

### Added
- New default transformation: **Translate to Urban English** (⌃⌘U on macOS, Ctrl+Shift+U on Win/Linux).
- HTML5 drag-and-drop reorder for transformations in the popup (drag the dotted handle).
- `chrome.commands` integration: `⌘⇧L` / `Ctrl+Shift+L` opens the settings popup from anywhere (including chrome:// pages). Per-transformation commands are exposed for opt-in user binding via `chrome://extensions/shortcuts`.
- Popup honors `prefers-color-scheme: light`, auto-flipping to light theme on macOS Appearance = Light.
- README: new macOS Ollama section using `launchctl setenv` (works with the official Ollama.app, unlike `export` in shell profiles).

### Changed
- **OpenRouter is now the default provider** for new installs. Existing users keep their stored provider via migration.
- OpenRouter model lineup refreshed: **Gemini 3.5 Flash** (default), **DeepSeek V4 Flash**, **Claude Sonnet Latest**. Custom model option preserved.
- OCR model updated to `google/gemini-3.5-flash`.
- Default shortcuts (platform-aware):
  - macOS: `⌃⌘T` (Translate), `⌃⌘G` (Grammar), `⌃⌘U` (Urban English).
  - Windows/Linux: `Ctrl+Shift+T/G/U`.

### Fixed
- **macOS Option dead-keys** no longer break shortcut matching. Letter/digit/F-keys are matched via `event.code` rather than `event.key`, so `⌥T → "†"` and similar composed characters are handled correctly.
- **Cmd and Ctrl are no longer folded** into a single modifier. The recorder displays the modifier you actually pressed (`⌘` for Command, `⌃` for Control) and shortcuts bound to `ctrl+X` no longer hijack `⌘X` on every page.
- **`chrome.action.openPopup()` fallback**: when the extension icon is unpinned (common on macOS), the "Manage Transformations…" context-menu entry now opens the popup in a new tab instead of failing silently.
- Mac-aware safe-modifier policy in editable fields: `Option` alone is no longer treated as safe (it's how Mac users type accented characters); `Cmd` or `Cmd+Shift` is required.
- Platform-aware system-conflict warning table (macOS `⌘T/W/N` + Cocoa Emacs-style Ctrl bindings).
- `navigator.platform` replaced with `navigator.userAgentData` + User-Agent fallback.
- Existing-user migrations carry stock-default bindings (`alt+t/c/g`, then `cmdorctrl+shift+t/c/g`) onto the v1.2.0 set without overwriting user customizations.

## [1.1.0] - Add Optical Character Recognition (OCR) using AI
- Add Optical Character Recognition (OCR)
- Available via right-clicking on any image
- Powered by Google Gemini Flash 3 using OpenRouter

## [1.0.0] - Official release 

- [Chrome Web Store](https://chrome.google.com/webstore/detail/browser-llm/)

### Added

- Initial release
- LLM-powered text transformations via context menu
- Support for OpenRouter API
- Support for local Ollama models
- Popup settings for API configuration
- Multiple transformation presets (Fix Grammar, Summarize, etc.)
