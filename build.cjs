const { build } = require('vite');
const { resolve } = require('path');
const { exec } = require('child_process');
const { copyFileSync, mkdirSync, existsSync, rmSync, writeFileSync, readdirSync, readFileSync, createWriteStream } = require('fs');
const util = require('util');
const archiver = require('archiver');

const execPromise = util.promisify(exec);

// Check for --prod flag
const isProd = process.argv.includes('--prod');
const outDir = isProd ? 'dist/prod' : 'dist';

async function buildCss() {
  try {
    // Build popup CSS
    await execPromise(`pnpm tailwindcss -i ./src/styles/globals.css -o ./${outDir}/popup.css`);
    console.log('Popup CSS built successfully');

    // Build content script CSS (for shadow DOM)
    await execPromise(`pnpm tailwindcss -i ./src/styles/content.css -o ./${outDir}/content.css`);
    console.log('Content CSS built successfully');
  } catch (e) {
    console.error('CSS build failed:', e);
    throw e;
  }
}

async function copyManifest() {
  try {
    copyFileSync(resolve(__dirname, 'src/manifest.json'), resolve(__dirname, outDir, 'manifest.json'));
    console.log('Manifest copied successfully');
  } catch (e) {
    console.error('Manifest copy failed:', e);
    throw e;
  }
}

async function copyAssets() {
  try {
    const srcAssetsDir = resolve(__dirname, 'assets');
    const distAssetsDir = resolve(__dirname, outDir, 'assets');

    if (!existsSync(distAssetsDir)) {
      mkdirSync(distAssetsDir, { recursive: true });
    }

    const files = readdirSync(srcAssetsDir);
    for (const file of files) {
      copyFileSync(resolve(srcAssetsDir, file), resolve(distAssetsDir, file));
    }
    console.log('Assets copied successfully');
  } catch (e) {
    console.error('Assets copy failed:', e);
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
    writeFileSync(resolve(__dirname, outDir, 'popup.html'), popupHtml);
    console.log('Popup HTML created successfully');
  } catch (e) {
    console.error('Popup HTML creation failed:', e);
    throw e;
  }
}

async function createZip() {
  return new Promise((resolvePromise, reject) => {
    try {
      // Read manifest to get name and version
      const manifest = JSON.parse(readFileSync(resolve(__dirname, outDir, 'manifest.json'), 'utf8'));
      const extensionName = manifest.name.toLowerCase().replace(/\s+/g, '-');
      const version = manifest.version;
      const zipFileName = `${extensionName}-v${version}.zip`;
      const zipPath = resolve(__dirname, outDir, zipFileName);

      const output = createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        const sizeKB = (archive.pointer() / 1024).toFixed(2);
        console.log(`ZIP created: ${zipFileName} (${sizeKB} KB)`);
        resolvePromise(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add all files from dist/prod to the root of the ZIP
      archive.directory(resolve(__dirname, outDir), false);

      archive.finalize();
    } catch (e) {
      reject(e);
    }
  });
}

async function buildExtension() {
  try {
    console.log(`Building extension (${isProd ? 'PRODUCTION' : 'development'})...`);
    console.log(`Output directory: ${outDir}`);

    // Clean output folder
    if (existsSync(resolve(__dirname, outDir))) {
      rmSync(resolve(__dirname, outDir), { recursive: true });
    }
    mkdirSync(resolve(__dirname, outDir), { recursive: true });

    // Build options - no sourcemaps for prod
    const buildOverrides = {
      build: {
        outDir: resolve(__dirname, outDir),
        sourcemap: !isProd,
      },
    };

    console.log('Building content script...');
    await build({
      configFile: resolve(__dirname, 'vite.content.config.ts'),
      mode: 'production',
      ...buildOverrides,
    });

    console.log('Building background script...');
    await build({
      configFile: resolve(__dirname, 'vite.background.config.ts'),
      mode: 'production',
      ...buildOverrides,
    });

    console.log('Building popup...');
    await build({
      configFile: resolve(__dirname, 'vite.popup.config.ts'),
      mode: 'production',
      ...buildOverrides,
    });

    // Build CSS
    await buildCss();

    // Copy manifest
    await copyManifest();

    // Copy assets (icons)
    await copyAssets();

    // Create popup HTML
    await createPopupHtml();

    console.log(`\nExtension built successfully to ${outDir}/`);

    // Create ZIP for Chrome Web Store submission (prod only)
    if (isProd) {
      console.log('\nCreating ZIP for Chrome Web Store...');
      const zipPath = await createZip();
      console.log(`\nReady for Chrome Web Store submission!`);
      console.log(`Upload this file: ${zipPath}`);
    }
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
}

buildExtension();
