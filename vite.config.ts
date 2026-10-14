import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const apiUrl = process.env.API_URL ?? "http://localhost:3000";

export default defineConfig({
  root: "web",
  plugins: [react()],
  server: {
    port: 5173,
    // Фронтенд импортирует пример из data/, который лежит вне папки web/.
    fs: { allow: [projectRoot] },
    // Запросы к API проксируются на Express, поэтому CORS не нужен.
    proxy: {
      "/reprice": apiUrl,
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
