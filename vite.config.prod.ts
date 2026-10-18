import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // No base path for custom domain
    base: '/',

    plugins: [react(), tailwindcss()],

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
