import type { Metadata } from "next";

// Painel instalável no celular (app na tela inicial) e fora do Google
export const metadata: Metadata = {
  manifest: "/painel.webmanifest",
  robots: { index: false, follow: false },
  icons: { apple: "/painel/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Energyza", statusBarStyle: "black-translucent" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
