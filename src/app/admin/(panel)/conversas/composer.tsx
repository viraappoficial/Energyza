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
    <form action={action} className="min-w-0 bg-[#202c33] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <input type="hidden" name="chatId" value={chatId} />
      <div className="no-scrollbar -mx-0.5 mb-2 flex gap-2 overflow-x-auto px-0.5">
        {quick.map((q) => (
          <button key={q} type="button" onClick={() => setText(q)} className="shrink-0 rounded-full bg-[#2a3942] px-3 py-1.5 text-xs text-[#d1d7db] hover:bg-[#32454f]">
            {q.length > 30 ? q.slice(0, 28) + "…" : q}
          </button>
        ))}
      </div>
      {fileName && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#2a3942] px-3 py-2 text-sm text-[#e9edef]">
          <span className="min-w-0 truncate">📎 {fileName}</span>
          <button type="button" aria-label="Tirar arquivo" onClick={() => { setFileName(""); if (fileInput.current) fileInput.current.value = ""; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {state.error && <p className="mb-2 rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{state.error}</p>}
      <div className="flex items-end gap-2">
        <div className="flex min-h-12 min-w-0 flex-1 items-end rounded-3xl bg-[#2a3942] pl-1">
          <label className="grid h-12 w-11 shrink-0 cursor-pointer place-items-center text-[#8696a0] hover:text-[#e9edef]" aria-label="Anexar arquivo">
            <Paperclip className="h-6 w-6" />
            <input ref={fileInput} name="file" type="file" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
          </label>
          <textarea
            name="text"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem"
            className="max-h-32 min-h-12 min-w-0 flex-1 resize-none bg-transparent py-3 pr-4 text-[1rem] text-[#e9edef] outline-none placeholder:text-[#8696a0]"
          />
        </div>
        <button disabled={pending || (!text.trim() && !fileName)} aria-label="Enviar" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#111b21] transition-opacity disabled:opacity-50">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
