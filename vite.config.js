import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // if 5173 is taken (e.g. another session), use the next free port
    // Windows-safe watcher: never choke on half-downloaded files or the
    // large source image folders — a .crdownload file used to crash the
    // whole dev stack with EBUSY.
    watch: {
      ignored: [
        "**/*.crdownload",
        "**/*.part",
        "**/*.tmp",
        "**/*.download",
        "**/combo images/**",
        "**/dist/**",
        "**/backend/enquiries.json",
      ],
    },
    proxy: {
      "/api": {
        // Node service (port 5000) reads backend/data/pricing.js — the single
        // source of truth — so the site ALWAYS shows the real prices.
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
