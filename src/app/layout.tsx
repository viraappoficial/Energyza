import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Energyza | Soluções em Elétrica em Maringá",
    template: "%s | Energyza",
  },
  description:
    "Eletricista em Maringá e região: instalações, manutenção, quadros e disjuntores e diagnóstico elétrico. Profissional com NR-10 e NR-35. Agende online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
