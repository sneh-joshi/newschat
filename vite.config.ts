import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const resolveFromRoot = (path: string) => new URL(path, import.meta.url).pathname

export default defineConfig(({ mode }) => {
  // Pass 2a: build background.js
  if (mode === 'background') {
    return {
      plugins: [],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolveFromRoot('background.ts'),
          name: 'background',
          formats: ['iife'],
          fileName: () => 'background.js',
        },
      },
    }
  }

  // Pass 2b: build content.js
  if (mode === 'content') {
    return {
      plugins: [],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolveFromRoot('content.ts'),
          name: 'content',
          formats: ['iife'],
          fileName: () => 'content.js',
        },
      },
    }
  }

  // Pass 1 (default): build panel + options React UI
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          panel: resolveFromRoot('panel.html'),
          options: resolveFromRoot('options.html'),
        },
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  }
})
