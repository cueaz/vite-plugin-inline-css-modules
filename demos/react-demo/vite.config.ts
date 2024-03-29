import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import inlineCssModules from '@cueaz/vite-plugin-inline-css-modules';
import pluginInspect from 'vite-plugin-inspect';

export default defineConfig({
  plugins: [inlineCssModules(), react(), pluginInspect()],
  build: {
    sourcemap: true,
  },
});
