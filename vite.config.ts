import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_API_TARGET ?? `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  plugins: [react()],
  root: "apps/web",
  server: {
    port: 5173,
    proxy: {
      "/api": apiTarget,
      "/storage": apiTarget
    }
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true
  }
});
