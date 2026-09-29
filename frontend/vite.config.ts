import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Inline Vite plugin: stamps dist/sw.js with a build timestamp on every
// production build so the PWA service worker cache auto-invalidates.
// Developers never need to manually bump the cache version string again.
function swCacheStamp(): Plugin {
  return {
    name: "sw-cache-stamp",
    apply: "build",
    closeBundle() {
      const swDist = path.resolve(__dirname, "dist", "sw.js");
      if (!fs.existsSync(swDist)) return;
      const version = `orca-2.0-cache-${Date.now()}`;
      const updated = fs.readFileSync(swDist, "utf-8").replace(
        "__SW_CACHE_VERSION__",
        version,
      );
      fs.writeFileSync(swDist, updated);
      console.log(`[sw-cache-stamp] Cache version → ${version}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), swCacheStamp()],
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
    // Dev server talks to the FastAPI backend without CORS friction.
    // `/api` is the canonical prefix. The bare ORCA 2.0 root paths are also
    // proxied so any direct root call (or older code path) still reaches the
    // backend in dev instead of being served index.html — see INT-001.
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/plan": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/trace": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/state": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/voyages": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/alerts": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/voice": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
