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
          // تقسیم کد برای بارگذاری سریع‌تر
          manualChunks: {
            // کتابخانه‌های React به chunk جداگانه
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // کتابخانه‌های دیگر
            'utils-vendor': ['axios', 'xlsx', 'lucide-react'],
          },
        },
      },
    },
  };
});
