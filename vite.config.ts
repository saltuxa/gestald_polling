import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        panel: resolve(__dirname, "panel.html"),
        mobile: resolve(__dirname, "mobile.html"),
        config: resolve(__dirname, "config.html"),
        dashboard: resolve(__dirname, "dashboard.html")
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
