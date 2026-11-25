import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(packageJson.version) },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase/firestore")) return "firebase-firestore";
          if (id.includes("firebase/auth")) return "firebase-auth";
          if (id.includes("firebase")) return "firebase-core";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react")) return "react";
        }
      }
    }
  }
});

