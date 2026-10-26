import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // só afeta o `next dev`: permite testar o painel em painel.energyzaeletrica.com.br
  allowedDevOrigins: ["*.energyzaeletrica.com.br"],
  // anexos do WhatsApp enviados pelo painel (a Vercel aceita até ~4,5 MB por requisição)
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
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
