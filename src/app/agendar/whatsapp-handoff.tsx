"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { track } from "@/lib/analytics";

// Depois de agendar, leva o cliente ao WhatsApp da Energyza com a mensagem pronta: assim é ele
// quem puxa a conversa (e a Energyza responde a quem já escreveu, sem risco para o número).
export function WhatsAppHandoff({ href }: { href: string }) {
  const [left, setLeft] = useState<number | null>(3);

  // contagem curta antes de abrir sozinho; o cliente pode cancelar ou tocar no botão antes
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      track("contact", { via: "whatsapp_agendamento" });
      window.location.assign(href);
      return;
    }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left, href]);

  return (
    <div className="grid gap-2">
      <a
        href={href}
        onClick={() => { setLeft(null); track("contact", { via: "whatsapp_agendamento" }); }}
        className="btn flex items-center justify-center gap-2 !bg-[#25d366] !py-4 text-lg font-bold !text-[#06210f]"
      >
        <MessageCircle className="h-6 w-6" /> Enviar no WhatsApp
      </a>
      {left !== null && left > 0 ? (
        <p className="text-center text-sm text-muted">
          Abrindo o WhatsApp em {left}…{" "}
          <button type="button" onClick={() => setLeft(null)} className="font-semibold text-gold underline">cancelar</button>
        </p>
      ) : (
        left === null && <p className="text-center text-sm text-muted">Toque no botão acima para enviar a mensagem.</p>
      )}
    </div>
  );
}
