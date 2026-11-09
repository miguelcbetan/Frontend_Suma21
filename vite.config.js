import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * El CORS del backend de datos (Render) solo admite el origen exacto
 * `http://localhost:5173`: el servidor de desarrollo y `vite preview` se fijan
 * en ese puerto (`strictPort` falla en vez de saltar a 5174) y deben abrirse
 * como `localhost`, no como `127.0.0.1`.
 */
const LOCAL_PORT = 5173;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host: "localhost", port: LOCAL_PORT, strictPort: true },
  preview: { host: "localhost", port: LOCAL_PORT, strictPort: true },
});
