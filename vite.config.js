import { fileURLToPath } from "node:url";

import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * El backend de datos permite `http://localhost:5173`, mientras que auth
 * requiere un origen HTTPS. Usa siempre `https://localhost:5173` en local.
 */
const LOCAL_PORT = 5173;

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host: "localhost", port: LOCAL_PORT, strictPort: true },
  preview: { host: "localhost", port: LOCAL_PORT, strictPort: true },
});
