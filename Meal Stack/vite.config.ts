import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Auth & Users → Auth Service (4001)
      "/auth":  { target: "http://localhost:4001", changeOrigin: true },
      "/users": { target: "http://localhost:4001", changeOrigin: true },
      // Restaurants + Menus → Restaurant Service (4002)
      "/restaurants": { target: "http://localhost:4002", changeOrigin: true },
      // Orders → Order Service (4003)
      "/orders": { target: "http://localhost:4003", changeOrigin: true },
      // Payments → Payment Service (4004)
      "/payments": { target: "http://localhost:4004", changeOrigin: true },
      // Deliveries → Rider Service (4005)
      "/deliveries": { target: "http://localhost:4005", changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
