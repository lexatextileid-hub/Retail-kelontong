// Build khusus pratinjau: seluruh aplikasi digabung jadi satu file HTML
// supaya bisa ditampilkan langsung di panel Claude tanpa server.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-pratinjau', emptyOutDir: true },
});
