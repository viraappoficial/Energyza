import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { business } from "@/lib/config";

export const metadata: Metadata = {
  title: "Política de privacidade",
  robots: { index: true, follow: true },
};

export default function PrivacidadePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-10 leading-relaxed text-muted">
        <h1 className="text-3xl font-bold text-foreground">Política de privacidade</h1>
        <p>
          Esta política explica como a {business.legalName} (CNPJ {business.cnpj}) trata seus
          dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD).
        </p>
        <h2 className="text-xl font-semibold text-foreground">Dados que coletamos</h2>
        <p>
          Ao agendar uma visita ou pedir um orçamento, coletamos nome, telefone, endereço do
          atendimento e observações. Usamos esses dados apenas para prestar o serviço, entrar em
          contato e emitir orçamentos.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Cookies e anúncios</h2>
        <p>
          Com o seu consentimento, usamos Google Analytics, Google Ads e Meta Pixel para entender
          como o site é usado e medir o resultado de anúncios. Guardamos também a origem da sua
          visita (por exemplo, o anúncio ou a busca em que você clicou). Você pode recusar os
          cookies no aviso exibido no site.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Compartilhamento</h2>
        <p>
          Não vendemos seus dados. Eles podem ser processados por provedores de hospedagem e
          banco de dados necessários para o funcionamento do site.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Seus direitos</h2>
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo
          e-mail <a className="text-gold underline" href={`mailto:${business.email}`}>{business.email}</a> ou
          pelo WhatsApp {business.phoneDisplay}.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
