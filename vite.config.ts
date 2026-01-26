import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import MagicString from "magic-string";

/**
 * Fix WASM data URL loading for @sparkjsdev/spark.
 *
 * Spark embeds WASM as: new URL("data:application/wasm;base64,...", import.meta.url)
 * The import.meta.url argument causes Vite to interfere with the data URL,
 * resulting in empty MIME types and corrupted WASM data.
 *
 * This plugin removes the second argument so the data URL works directly.
 *
 * CRITICAL: Uses `transform` hook (not `renderChunk`) to work in BOTH dev and build.
 */
function fixWasmDataUrl(): Plugin {
  const pattern = /new URL\("(data:application\/wasm;base64,[^"]+)",\s*import\.meta\.url\)/g;

  const doTransform = (code: string): { code: string; map: ReturnType<MagicString['generateMap']> } | null => {
    if (!pattern.test(code)) {
      return null;
    }

    const s = new MagicString(code);
    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(code)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      s.overwrite(start, end, `new URL("${match[1]}")`);
    }

    return {
      code: s.toString(),
      map: s.generateMap({ hires: true }),
    };
  };

  return {
    name: "fix-wasm-data-url",

    // Transform hook runs in BOTH dev and build modes
    transform(code, id) {
      // Performance: Only process Spark library files
      if (!id.includes("@sparkjsdev/spark") && !id.includes("spark.module")) {
        return null;
      }
      return doTransform(code);
    },

    // renderChunk as fallback for any chunks missed by transform
    renderChunk(code) {
      return doTransform(code);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    fixWasmDataUrl(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Include WASM files as assets for proper MIME type serving
  assetsInclude: ['**/*.wasm'],
  // Exclude spark from optimization to prevent bundling issues with WASM
  optimizeDeps: {
    exclude: ['@sparkjsdev/spark'],
  },
  // Prevent WASM from being inlined as base64
  build: {
    target: 'esnext',
  },
}));
