"use client";

import { useState, useSyncExternalStore } from "react";
import { markQuoteSent } from "../../../actions";
import { brl } from "@/lib/format";
import { business } from "@/lib/config";

export type SendItem = { description: string; quantity: number; unit_price: number };

const noopSubscribe = () => () => {};
const qty = (n: number) => String(n).replace(".", ",");
const MAX_ENCODED = 3500; // limite prático de tamanho do link do WhatsApp

// Envio do orçamento pelo WhatsApp:
// - texto: o orçamento escrito, direto na conversa do cliente
// - PDF: no celular compartilha o arquivo; no computador baixa e abre a conversa
export function SendButtons({
  id,
  number,
  customerName,
  phone,
  status,
  items,
  discount,
  surcharge,
  validUntil,
  notes,
  issuedAt,
  address,
  city,
  state,
}: {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  status: string;
  items: SendItem[];
  discount: number;
  surcharge: number;
  validUntil: string;
  notes: string;
  issuedAt: string;
  address: string;
  city: string;
  state: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const canShareFiles = useSyncExternalStore(
    noopSubscribe,
    () =>
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [new File(["x"], "x.pdf", { type: "application/pdf" })] }),
    () => false,
  );

  const pdfPath = `/orcamento/${id}/pdf`;
  const first = customerName.split(" ")[0];
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - discount + surcharge);
  const validade = validUntil.split("-").reverse().join("/");
  const emitido = issuedAt.split("-").reverse().join("/");

  const chatUrl = (text: string) => {
    const digits = phone.replace(/\D/g, "").replace(/^55/, "");
    const base = digits ? `https://wa.me/55${digits}` : "https://wa.me/";
    return `${base}?text=${encodeURIComponent(text)}`;
  };
  const afterSend = () => {
    if (status === "rascunho") void markQuoteSent(id);
  };

  // orçamento escrito, organizado em blocos (formatação do WhatsApp: *negrito*, _itálico_).
  // emoji: o WhatsApp do computador (Windows) quebra emoji vindo de link; no celular funciona.
  function writtenMessage(withItems: boolean, emoji: boolean) {
    const link = `${window.location.origin}${pdfPath}`;
    const line = "━━━━━━━━━━━━━━━";
    const e = (icon: string) => (emoji ? `${icon} ` : "");
    const where = [address, [city, state].filter(Boolean).join("/")].filter(Boolean).join(" — ");
    const out: string[] = [
      `${e("⚡")}*ENERGYZA ELÉTRICA*`,
      "_Soluções em Elétrica_",
      "",
      `Olá, ${first}! Segue o seu orçamento.${emoji ? " 👇" : ""}`,
      "",
      `${e("📋")}*ORÇAMENTO Nº ${number}*`,
      line,
      `${e("👤")}*Cliente:* ${customerName}`,
    ];
    if (where) out.push(`${e("📍")}*Local:* ${where}`);
    out.push(`${e("📅")}*Emitido em:* ${emitido}`, `${e("⏳")}*Válido até:* ${validade}`, "");

    out.push(`${e("🔧")}*SERVIÇOS E MATERIAIS*`, line);
    if (withItems) {
      items.forEach((it, i) => {
        out.push(`*${i + 1}. ${it.description}*`);
        out.push(`    ${qty(it.quantity)} × ${brl(it.unit_price)} = *${brl(it.quantity * it.unit_price)}*`, "");
      });
    } else {
      out.push(`${items.length} itens (veja a lista completa no PDF abaixo)`, "");
    }

    out.push(line);
    if (discount > 0 || surcharge > 0) out.push(`Subtotal: ${brl(subtotal)}`);
    if (discount > 0) out.push(`Desconto: − ${brl(discount)}`);
    if (surcharge > 0) out.push(`Acréscimo: + ${brl(surcharge)}`);
    out.push(`${e("💰")}*TOTAL: ${brl(total)}*`, line, "");

    if (notes.trim()) out.push(`${e("📝")}*Condições e observações*`, notes.trim(), "");
    out.push(`${e("📄")}*Orçamento em PDF:*`, link, "", `Qualquer dúvida, estou à disposição!${emoji ? " 🤝" : ""}`, `*Energyza Elétrica* · ${business.phoneDisplay}`);
    return out.join("\n");
  }

  const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  function sendText() {
    setError("");
    const emoji = isMobile();
    let text = writtenMessage(true, emoji);
    if (encodeURIComponent(text).length > MAX_ENCODED) text = writtenMessage(false, emoji); // muitos itens: resumo + link
    window.open(chatUrl(text), "_blank", "noopener");
    afterSend();
    setInfo("");
  }

  // copia a mensagem completa (com emojis): colar na conversa mantém tudo
  async function copyText() {
    setError("");
    try {
      await navigator.clipboard.writeText(writtenMessage(true, true));
      setInfo("Texto copiado. É só colar na conversa do WhatsApp.");
    } catch {
      setError("Não foi possível copiar o texto.");
    }
  }

  async function sendPdf() {
    setError("");
    setInfo("");
    const text = `Olá ${first}! Segue em anexo o orçamento nº ${number} da Energyza Elétrica, no valor de ${brl(total)}, válido até ${validade}.`;
    if (canShareFiles) {
      // celular: abre a folha de compartilhar já com o arquivo PDF
      setBusy(true);
      try {
        const res = await fetch(pdfPath);
        if (!res.ok) throw new Error("pdf");
        const file = new File([await res.blob()], `orcamento-${number}-energyza.pdf`, { type: "application/pdf" });
        await navigator.share({ files: [file], text });
        afterSend();
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Não foi possível compartilhar o PDF. Tente o botão de texto.");
      } finally {
        setBusy(false);
      }
      return;
    }
    // computador: abre a conversa do cliente e baixa o PDF para anexar (📎)
    window.open(chatUrl(text), "_blank", "noopener");
    const a = document.createElement("a");
    a.href = `${pdfPath}?download=1`;
    a.download = `orcamento-${number}-energyza.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    afterSend();
    setInfo("PDF baixado. No WhatsApp, toque no clipe (📎) → Documento e escolha o arquivo.");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${pdfPath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar o link.");
    }
  }

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={sendPdf} disabled={busy} className="btn btn-gold !py-3.5">
          {busy ? "Preparando o PDF…" : canShareFiles ? "Enviar PDF no WhatsApp" : "Baixar PDF e enviar"}
        </button>
        <button type="button" onClick={sendText} className="btn btn-outline !py-3.5">Enviar por texto</button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={copyText} className="btn btn-outline !px-2 !py-2.5 text-sm">Copiar texto</button>
        <button type="button" onClick={copyLink} className="btn btn-outline !px-2 !py-2.5 text-sm">
          {copied ? "Copiado ✓" : "Copiar link"}
        </button>
        <a href={`${pdfPath}?download=1`} className="btn btn-outline !px-2 !py-2.5 text-sm">Baixar PDF</a>
      </div>
      {info && <p className="mt-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">{info}</p>}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <p className="mt-2 text-xs text-muted">
        {canShareFiles
          ? "“Enviar PDF”: escolha o WhatsApp e o cliente na tela de compartilhar. "
          : "“Baixar PDF e enviar”: baixa o arquivo e abre a conversa do cliente para anexar. "}
        “Enviar por texto” abre a conversa com o orçamento escrito, pronto para enviar.
      </p>
    </div>
  );
}
