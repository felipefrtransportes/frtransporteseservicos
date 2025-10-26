import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./", // Importante para funcionar na Vercel
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // Corrige o alias @
    },
  },
  build: {
    outDir: "dist",
  },
});
