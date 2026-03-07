import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Lovable-tagger is kept as optional for Lovable platform compatibility.
// It can be safely removed when fully migrating to Azure.
let lovableTagger: any;
try {
  lovableTagger = require("lovable-tagger");
} catch {
  // lovable-tagger not available outside Lovable — this is expected
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && lovableTagger?.componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
