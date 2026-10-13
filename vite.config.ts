import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "recharts", test: /[\\/]node_modules[\\/]recharts[\\/]/, priority: 20 },
            { name: "react", test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 15 },
            { name: "vendor", test: /[\\/]node_modules[\\/]/, priority: 10, maxSize: 500_000 },
          ],
        },
      },
    },
  },
});
