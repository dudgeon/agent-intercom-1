import { defineConfig } from "vite";

// Dev server for the host. On the device this same bundle is served to a kiosk Chromium; in dev
// it runs in any desktop browser. Point it at a gateway with ?gw=ws://host:8788 (default below).
export default defineConfig({
  server: { port: 5173, host: true },
});
