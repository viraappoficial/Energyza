import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // só afeta o `next dev`: permite testar o painel em painel.energyzaeletrica.com.br
  allowedDevOrigins: ["*.energyzaeletrica.com.br"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
