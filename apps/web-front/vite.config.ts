import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api/front': {
            changeOrigin: true,
            target: 'http://127.0.0.1:8006',
            ws: true,
          },
        },
      },
    },
  };
});
