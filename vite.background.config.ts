import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
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
      entry: resolve(__dirname, 'src/background/index.ts'),
      name: 'background',
      formats: ['iife'],
      fileName: () => 'background.js',
    },
    rollupOptions: {
      external: ['chrome'],
      output: {
        extend: true,
        globals: {
          chrome: 'chrome',
        },
        inlineDynamicImports: true,
      },
    },
    target: 'esnext',
  },
  publicDir: false,
});
