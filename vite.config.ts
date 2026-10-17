import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // مسیر پایه برای GitHub Pages (نام ریپو)
    base: '/myshop-panel/',

    plugins: [react(), tailwindcss()],

    server: {
      watch: {
        ignored: [
          '**/backend/data/**',
          '**/backend/uploads/**',
        ],
      },

      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
        },

        '/uploads': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },

      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
      },
    },

    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          manualChunks: (moduleId: string) => {
            if (!moduleId.includes('node_modules')) {
              return undefined;
            }

            if (
              moduleId.includes('react') ||
              moduleId.includes('react-dom') ||
              moduleId.includes('react-router')
            ) {
              return 'react-vendor';
            }

            if (
              moduleId.includes('axios') ||
              moduleId.includes('xlsx') ||
              moduleId.includes('lucide-react')
            ) {
              return 'utils-vendor';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
