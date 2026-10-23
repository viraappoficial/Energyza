"use client";

import { useState, useSyncExternalStore } from "react";
import { markQuoteSent } from "../../../actions";

const noopSubscribe = () => () => {};

// Envio do orçamento: abre a conversa do cliente no WhatsApp com o link do PDF
// e, quando o aparelho permite (celular), compartilha o próprio arquivo PDF.
export function SendButtons({
  id,
  number,
  customerName,
  phone,
  totalLabel,
  status,
}: {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  totalLabel: string;
  status: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canShareFiles = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [new File(["x"], "x.pdf", { type: "application/pdf" })] }),
    () => false,
  );

  const pdfPath = `/orcamento/${id}/pdf`;
  const absolute = () => `${window.location.origin}${pdfPath}`;
  const message = () =>
    `Olá ${customerName.split(" ")[0]}! Segue o orçamento nº ${number} da Energyza Elétrica, no valor de ${totalLabel}.\n\nPDF: ${absolute()}\n\nQualquer dúvida é só me chamar.`;

  const afterSend = () => {
    if (status === "rascunho") void markQuoteSent(id);
  };

  function sendWhatsApp() {
    const digits = phone.replace(/\D/g, "").replace(/^55/, "");
    const base = digits ? `https://wa.me/55${digits}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(message())}`, "_blank", "noopener");
    afterSend();
  }

  async function shareFile() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(pdfPath);
      if (!res.ok) throw new Error("pdf");
      const blob = await res.blob();
      const file = new File([blob], `orcamento-${number}-energyza.pdf`, { type: "application/pdf" });
      await navigator.share({ files: [file], text: message() });
      afterSend();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Não foi possível compartilhar. Use o botão do WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absolute());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar o link.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={sendWhatsApp} className="btn btn-gold">
          Enviar no WhatsApp
        </button>
        {canShareFiles && (
          <button type="button" onClick={shareFile} disabled={busy} className="btn btn-outline">
            {busy ? "Preparando…" : "Compartilhar o PDF"}
          </button>
        )}
        <a href={`${pdfPath}?download=1`} className="btn btn-outline">Baixar PDF</a>
        <button type="button" onClick={copyLink} className="btn btn-outline">
          {copied ? "Link copiado ✓" : "Copiar link"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <p className="mt-2 text-xs text-muted">
        “Enviar no WhatsApp” abre a conversa com o cliente e a mensagem pronta, com o link do PDF.
        {canShareFiles ? " “Compartilhar o PDF” envia o arquivo em si: escolha o WhatsApp e o contato." : ""}
      </p>
    </div>
  );
}
