import type { Metadata } from "next";

// Painel instalável no celular (app na tela inicial) e fora do Google
export const metadata: Metadata = {
  manifest: "/painel.webmanifest",
  robots: { index: false, follow: false },
  // o ícone da aba precisa vir aqui: definir `icons` neste layout substitui o do site, e sem ele o Chrome mostra o globinho
  icons: {
    icon: [{ url: "/painel/favicon-64.png", sizes: "64x64", type: "image/png" }, { url: "/painel/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/painel/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Energyza", statusBarStyle: "black-translucent" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
