import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Content script entry point
// Uses Shadow DOM for style isolation from host page

const CONTAINER_ID = 'browser-llm-root';

function initContentScript() {
  // Prevent double initialization
  if (document.getElementById(CONTAINER_ID)) {
    console.log('[Browser LLM] Content script already initialized');
    return;
  }

  console.log('[Browser LLM] Initializing content script...');

  // Create container element
  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  // Attach shadow root for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Inject styles into shadow DOM
  const styleSheet = document.createElement('style');
  styleSheet.textContent = getStyles();
  shadowRoot.appendChild(styleSheet);

  // Create React mount point inside shadow DOM
  const appRoot = document.createElement('div');
  appRoot.id = 'browser-llm-app';
  shadowRoot.appendChild(appRoot);

  // Append to body
  document.body.appendChild(container);

  // Mount React app
  const root = ReactDOM.createRoot(appRoot);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('[Browser LLM] Content script initialized');
}

/**
 * Get CSS styles for the shadow DOM.
 * Includes Tailwind base styles and component styles.
 */
function getStyles(): string {
  return `
    /* CSS Reset for shadow DOM */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* CSS Variables */
    :host {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 222.2 84% 4.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96.1%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --ring: 222.2 84% 4.9%;
      --radius: 0.5rem;

      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: hsl(var(--foreground));
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      :host {
        --background: 222.2 84% 4.9%;
        --foreground: 210 40% 98%;
        --card: 222.2 84% 4.9%;
        --card-foreground: 210 40% 98%;
        --popover: 222.2 84% 4.9%;
        --popover-foreground: 210 40% 98%;
        --primary: 210 40% 98%;
        --primary-foreground: 222.2 47.4% 11.2%;
        --secondary: 217.2 32.6% 17.5%;
        --secondary-foreground: 210 40% 98%;
        --muted: 217.2 32.6% 17.5%;
        --muted-foreground: 215 20.2% 65.1%;
        --accent: 217.2 32.6% 17.5%;
        --accent-foreground: 210 40% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 210 40% 98%;
        --border: 217.2 32.6% 17.5%;
        --input: 217.2 32.6% 17.5%;
        --ring: 212.7 26.8% 83.9%;
      }
    }

    /* Utility classes */
    .fixed { position: fixed; }
    .absolute { position: absolute; }
    .relative { position: relative; }

    .z-\\[2147483647\\] { z-index: 2147483647; }

    .flex { display: flex; }
    .inline-block { display: inline-block; }
    .hidden { display: none; }

    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-end { justify-content: flex-end; }

    .gap-2 { gap: 0.5rem; }

    .w-\\[380px\\] { width: 380px; }
    .w-2 { width: 0.5rem; }
    .w-full { width: 100%; }
    .w-3\\/4 { width: 75%; }
    .w-5\\/6 { width: 83.333333%; }

    .max-w-\\[90vw\\] { max-width: 90vw; }

    .h-4 { height: 1rem; }

    .min-h-\\[80px\\] { min-height: 80px; }
    .max-h-\\[300px\\] { max-height: 300px; }

    .overflow-y-auto { overflow-y: auto; }

    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }

    .ml-0\\.5 { margin-left: 0.125rem; }
    .mt-1 { margin-top: 0.25rem; }

    .space-y-2 > * + * { margin-top: 0.5rem; }

    .border { border-width: 1px; border-color: hsl(var(--border)); }
    .border-b { border-bottom-width: 1px; border-color: hsl(var(--border)); }
    .border-t { border-top-width: 1px; border-color: hsl(var(--border)); }

    .rounded-md { border-radius: calc(var(--radius) - 2px); }
    .rounded-lg { border-radius: var(--radius); }

    .bg-background { background-color: hsl(var(--background)); }
    .bg-primary { background-color: hsl(var(--primary)); }
    .bg-secondary { background-color: hsl(var(--secondary)); }
    .bg-muted { background-color: hsl(var(--muted)); }

    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }

    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }

    .leading-relaxed { line-height: 1.625; }

    .text-foreground { color: hsl(var(--foreground)); }
    .text-primary { color: hsl(var(--primary)); }
    .text-primary-foreground { color: hsl(var(--primary-foreground)); }
    .text-secondary-foreground { color: hsl(var(--secondary-foreground)); }
    .text-muted-foreground { color: hsl(var(--muted-foreground)); }
    .text-destructive { color: hsl(var(--destructive)); }

    .whitespace-pre-wrap { white-space: pre-wrap; }

    .shadow-xl {
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    }

    .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
    .transition-colors { transition-property: color, background-color, border-color; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
    .duration-200 { transition-duration: 200ms; }

    .opacity-0 { opacity: 0; }
    .opacity-100 { opacity: 1; }

    .scale-95 { transform: scale(0.95); }
    .scale-100 { transform: scale(1); }

    .pointer-events-none { pointer-events: none; }

    .cursor-pointer { cursor: pointer; }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .hover\\:text-foreground:hover { color: hsl(var(--foreground)); }
    .hover\\:bg-primary\\/90:hover { background-color: hsl(var(--primary) / 0.9); }
    .hover\\:bg-secondary\\/80:hover { background-color: hsl(var(--secondary) / 0.8); }

    /* Card component */
    .card {
      background-color: hsl(var(--card));
      color: hsl(var(--card-foreground));
      border-radius: var(--radius);
      border: 1px solid hsl(var(--border));
    }

    /* Badge component */
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      padding: 0.125rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1;
    }

    .badge-secondary {
      background-color: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
    }

    /* Button component */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: calc(var(--radius) - 2px);
      font-size: 0.875rem;
      font-weight: 500;
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
      cursor: pointer;
      border: none;
    }

    .btn:focus-visible {
      outline: 2px solid hsl(var(--ring));
      outline-offset: 2px;
    }

    .btn:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    .btn-sm {
      height: 2rem;
      padding: 0 0.75rem;
      font-size: 0.75rem;
    }

    .btn-primary {
      background-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }

    .btn-primary:hover {
      background-color: hsl(var(--primary) / 0.9);
    }

    .btn-outline {
      background-color: transparent;
      border: 1px solid hsl(var(--input));
      color: hsl(var(--foreground));
    }

    .btn-outline:hover {
      background-color: hsl(var(--accent));
      color: hsl(var(--accent-foreground));
    }

    /* Skeleton component */
    .skeleton {
      background-color: hsl(var(--muted));
      border-radius: calc(var(--radius) - 2px);
      animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background-color: hsl(var(--muted-foreground) / 0.3);
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background-color: hsl(var(--muted-foreground) / 0.5);
    }
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
