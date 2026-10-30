import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  build: { target: "chrome120", reportCompressedSize: false },
  server: {
    port: 1430,
    strictPort: true,
    host: "127.0.0.1",
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
