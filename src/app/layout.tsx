import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { BookingProvider } from "@/components/booking-modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <BookingProvider>{children}</BookingProvider>
        <Analytics />
      </body>
    </html>
  );
}
