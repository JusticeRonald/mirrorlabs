import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Include WASM files as assets for proper MIME type serving
  assetsInclude: ['**/*.wasm'],
  // Exclude spark from optimization to prevent bundling issues with WASM
  optimizeDeps: {
    exclude: ['@spark-web-viewer/core'],
  },
}));
