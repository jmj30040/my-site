import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    // GitHub Pages 저장소명이 다르면 VITE_BASE_PATH=/저장소명/ 으로 지정하세요.
    base: env.VITE_BASE_PATH || "/"
  };
});
