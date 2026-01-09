import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,  // Vite dev server port (this is the default)
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,  // Enable WebSocket proxying
      },
    },
  },
});
