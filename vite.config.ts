import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
      // کاهش حجم خروجی
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      // کاهش حجم با minification پیشرفته
      minify: 'esbuild',
      // افزایش حد هشدار برای chunk‌های بزرگ
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          // تقسیم کد با تابع (Rollup API جدید)
          manualChunks: (moduleId: string) => {
            // فقط node_modules ها رو split کن
            if (!moduleId.includes('node_modules')) {
              return undefined;
            }

            // کتابخانه‌های React
            if (
              moduleId.includes('react') ||
              moduleId.includes('react-dom') ||
              moduleId.includes('react-router')
            ) {
              return 'react-vendor';
            }

            // کتابخانه‌های utils
            if (
              moduleId.includes('axios') ||
              moduleId.includes('xlsx') ||
              moduleId.includes('lucide-react')
            ) {
              return 'utils-vendor';
            }

            // بقیه node_modules
            return 'vendor';
          },
        },
      },
    },
  };
});
