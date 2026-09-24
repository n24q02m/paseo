import { defineConfig } from "vitest/config";

// Local config so `npm test` is self-contained: without it, vitest walks up
// and loads the repository-root config, which this standalone plugin tree
// cannot resolve.
export default defineConfig({
  resolve: {
    // Panels import react-native primitives (Text/View); the host app's own
    // vitest config maps them to react-native-web. Mirror that here so the
    // standalone plugin tree transforms the import graph without Flow parsing.
    alias: {
      "react-native": "react-native-web",
    },
  },
  test: {
    environment: "node",
  },
});
