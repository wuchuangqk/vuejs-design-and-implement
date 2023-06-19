import { defineConfig } from 'vite'
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 9090
  }
})
