import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@kutalia/whisper-node-addon'],
    },
  },
});
