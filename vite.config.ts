import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  // This tells Vite that your frontend code is in the 'client' folder
  root: path.resolve(__dirname, "client"),
  build: {
    // This tells Vite to build the output to a 'dist/public' folder at the project root
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});