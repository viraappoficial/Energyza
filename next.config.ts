import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as páginas.
// A CSP aqui trava o que é seguro travar sem quebrar as tags de medição (Google/Meta): nada de plugins,
// nada de <base> falso, formulários só para o próprio site e o site não abre dentro de iframe de terceiros.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
