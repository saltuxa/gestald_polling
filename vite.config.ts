import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html")
      },
      output: {
        format: "iife",
        entryFileNames: "app.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001"
    }
  },
  test: {
    include: ["src/**/*.test.ts"]
  }
});
