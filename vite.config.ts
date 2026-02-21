import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        {
          name: 'copy-extension-files',
          closeBundle() {
            copyFileSync('manifest.json', 'dist/manifest.json');
            copyFileSync('background.js', 'dist/background.js');
            if (!existsSync('dist/icons')) mkdirSync('dist/icons', { recursive: true });
            ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
              if (existsSync(`icons/${icon}`)) copyFileSync(`icons/${icon}`, `dist/icons/${icon}`);
            });
          }
        }
      ],
      base: '/manga-video-generator/',
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: {
            dashboard: path.resolve(__dirname, 'dashboard/index.html'),
          },
          output: {
            entryFileNames: 'dashboard/assets/[name]-[hash].js',
            chunkFileNames: 'dashboard/assets/[name]-[hash].js',
            assetFileNames: 'dashboard/assets/[name]-[hash].[ext]',
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.FAL_API_KEY': JSON.stringify(env.FAL_API_KEY || ''),
        'process.env.ELEVENLABS_API_KEY': JSON.stringify(env.ELEVENLABS_API_KEY || ''),
        'process.env.ELEVENLABS_VOICE_ID': JSON.stringify(env.ELEVENLABS_VOICE_ID || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'dashboard'),
        }
      }
    };
});
