"use client";

import { useActionState, useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { sendWhatsApp, type ChatState } from "../../actions";

const quick = [
  "Olá! Aqui é da Energyza. Como posso ajudar?",
  "Qual o endereço do atendimento?",
  "Pode me mandar uma foto do local ou do problema?",
  "Segue o orçamento. Qualquer dúvida, é só falar.",
];

export function Composer({ chatId }: { chatId: string }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // enviou: limpa o campo (feito aqui, na resposta da ação, e não num efeito)
  const [state, action, pending] = useActionState(async (prev: ChatState, fd: FormData) => {
    const r = await sendWhatsApp(prev, fd);
    if (r.ok) {
      setText("");
      setFileName("");
      if (fileInput.current) fileInput.current.value = "";
    }
    return r;
  }, {} as ChatState);

  return (
    <form ref={form} action={action} className="space-y-2">
      <input type="hidden" name="chatId" value={chatId} />
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {quick.map((q) => (
          <button key={q} type="button" onClick={() => setText(q)} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-neutral-300 hover:border-gold hover:text-gold">
            {q.length > 30 ? q.slice(0, 28) + "…" : q}
          </button>
        ))}
      </div>
      {fileName && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">📎 {fileName}</span>
          <button type="button" aria-label="Tirar arquivo" onClick={() => { setFileName(""); if (fileInput.current) fileInput.current.value = ""; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {state.error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{state.error}</p>}
      <div className="flex items-end gap-2">
        <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-lg border border-border text-gold hover:border-gold" aria-label="Anexar arquivo">
          <Paperclip className="h-5 w-5" />
          <input ref={fileInput} name="file" type="file" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
        </label>
        <textarea
          name="text"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem"
          className="input !min-h-12 max-h-32 flex-1 resize-none"
        />
        <button disabled={pending || (!text.trim() && !fileName)} aria-label="Enviar" className="btn btn-gold !h-12 !w-12 shrink-0 !p-0">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
