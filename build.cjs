const { build } = require('vite');
const { resolve } = require('path');
const { exec } = require('child_process');
const { copyFileSync, mkdirSync, existsSync, rmSync, writeFileSync } = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);

async function buildCss() {
  try {
    await execPromise('pnpm tailwindcss -i ./src/styles/globals.css -o ./dist/popup.css');
    console.log('CSS built successfully');
  } catch (e) {
    console.error('CSS build failed:', e);
    throw e;
  }
}

async function copyManifest() {
  try {
    copyFileSync(resolve(__dirname, 'src/manifest.json'), resolve(__dirname, 'dist/manifest.json'));
    console.log('Manifest copied successfully');
  } catch (e) {
    console.error('Manifest copy failed:', e);
    throw e;
  }
}

async function createPopupHtml() {
  try {
    const popupHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Browser LLM Settings</title>
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="popup.js"></script>
  </body>
</html>`;
    writeFileSync(resolve(__dirname, 'dist/popup.html'), popupHtml);
    console.log('Popup HTML created successfully');
  } catch (e) {
    console.error('Popup HTML creation failed:', e);
    throw e;
  }
}

async function buildExtension() {
  try {
    // Clean dist folder
    if (existsSync(resolve(__dirname, 'dist'))) {
      rmSync(resolve(__dirname, 'dist'), { recursive: true });
    }
    mkdirSync(resolve(__dirname, 'dist'));

    console.log('Building content script...');
    await build({
      configFile: resolve(__dirname, 'vite.content.config.ts'),
      mode: 'production',
    });

    console.log('Building background script...');
    await build({
      configFile: resolve(__dirname, 'vite.background.config.ts'),
      mode: 'production',
    });

    console.log('Building popup...');
    await build({
      configFile: resolve(__dirname, 'vite.popup.config.ts'),
      mode: 'production',
    });

    // Build CSS
    await buildCss();

    // Copy manifest
    await copyManifest();

    // Create popup HTML
    await createPopupHtml();

    console.log('Extension built successfully!');
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
}

buildExtension();
