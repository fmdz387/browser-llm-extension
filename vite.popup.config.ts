import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  define: {
    process: JSON.stringify({
      env: {
        NODE_ENV: 'production',
      },
    }),
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: true,
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/popup/index.tsx'),
      name: 'popup',
      formats: ['iife'],
      fileName: () => 'popup.js',
    },
    rollupOptions: {
      external: ['chrome'],
      output: {
        extend: true,
        globals: {
          chrome: 'chrome',
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
        },
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    target: 'esnext',
  },
  publicDir: false,
});
