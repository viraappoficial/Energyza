import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { BookingProvider } from "@/components/booking-modal";

// fontes dentro do projeto (sem depender do Google Fonts): carregam mais rápido e não vazam IP
const barlow = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/barlow-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/barlow-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/barlow-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/barlow-latin-700-normal.woff2", weight: "700" },
  ],
});
const barlowCondensed = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "./fonts/barlow-condensed-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/barlow-condensed-latin-700-normal.woff2", weight: "700" },
    { path: "./fonts/barlow-condensed-latin-800-normal.woff2", weight: "800" },
  ],
});

// celulares com notch/home indicator (env(safe-area-inset-*)), cor da barra do navegador
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Energyza | Soluções em Elétrica em Maringá",
    template: "%s | Energyza",
  },
  description:
    "Eletricista em Maringá e região: instalações, manutenção, quadros e disjuntores e diagnóstico elétrico. Profissional com NR-10 e NR-35. Agende online.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Energyza Soluções em Elétrica",
    title: "Eletricista em Maringá | Energyza",
    description:
      "Instalações, manutenção, quadros e disjuntores e diagnóstico elétrico em Maringá e região. Agende online.",
    images: ["/logo.png"],
  },
  alternates: { canonical: "/" },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <BookingProvider>{children}</BookingProvider>
        <Analytics />
      </body>
    </html>
  );
}
