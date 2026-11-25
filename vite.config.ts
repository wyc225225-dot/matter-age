import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/matter-age/" : "/",
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.svg", "icons/*.png"],
      manifest: {
        name: "物质纪元 Matter Age",
        short_name: "物质纪元",
        description: "从一滴水开始，探索物质的无限可能。",
        theme_color: "#0e1622",
        background_color: "#0e1622",
        display: "standalone",
        lang: "zh-CN",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icons/app.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/scheduler")
          )
            return "react-vendor";
          if (
            id.includes("node_modules/dexie") ||
            id.includes("node_modules/zod") ||
            id.includes("node_modules/zustand")
          )
            return "state-vendor";
          if (id.includes("node_modules/lucide-react")) return "icons-vendor";
        },
      },
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
