"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, FileText, FileUp, Mic, Paperclip, Search, Send, Trash2, X } from "lucide-react";
import { sendWhatsApp, type ChatState } from "../../actions";
import { brl } from "@/lib/format";
import { shrinkImage } from "@/lib/resize-image";

export type QuoteOption = {
  id: string;
  number: number;
  customer_name: string;
  status: string;
  total: number;
  valid_until: string;
  mine: boolean; // é do mesmo telefone desta conversa
};

const quick = [
  "Olá! Aqui é da Energyza. Como posso ajudar?",
  "Qual o endereço do atendimento?",
  "Pode me mandar uma foto do local ou do problema?",
  "Segue o orçamento. Qualquer dúvida, é só falar.",
];

const MAX_VOICE_SECONDS = 180;
const clock = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
// formato que este navegador sabe gravar (Chrome/Android: webm/opus; iPhone: mp4)
function voiceMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const num = (n: number) => String(n).padStart(4, "0");
const dmy = (d: string) => d.slice(0, 10).split("-").reverse().join("/");

export function Composer({ chatId, quotes, firstName }: { chatId: string; quotes: QuoteOption[]; firstName: string }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [quote, setQuote] = useState<QuoteOption | null>(null);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const voiceFlag = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // gravação de áudio
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [micError, setMicError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendAfterStop = useRef(false);

  const textArea = useRef<HTMLTextAreaElement>(null);
  // texto pronto vindo da faixa de cobrança
  useEffect(() => {
    const onFill = (e: Event) => {
      setText(String((e as CustomEvent).detail ?? ""));
      textArea.current?.focus();
    };
    window.addEventListener("wa-fill", onFill);
    return () => window.removeEventListener("wa-fill", onFill);
  }, []);

  // saiu da conversa no meio da gravação: solta o microfone
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  // enviou: limpa o campo (feito aqui, na resposta da ação, e não num efeito)
  const [state, action, pending] = useActionState(async (prev: ChatState, fd: FormData) => {
    const r = await sendWhatsApp(prev, fd);
    if (r.ok) {
      setText("");
      setFileName("");
      setQuote(null);
      if (fileInput.current) fileInput.current.value = "";
    }
    if (voiceFlag.current) voiceFlag.current.value = "";
    return r;
  }, {} as ChatState);

  // anexa um arquivo (do clipe ou da câmera); foto de celular passa do limite de envio, então reduz aqui antes de subir
  async function attachFile(file: File | undefined) {
    if (!file) { setFileName(""); return; }
    setQuote(null);
    let f = file;
    if (f.type.startsWith("image/") && f.type !== "image/gif") f = await shrinkImage(f);
    const dt = new DataTransfer();
    dt.items.add(f);
    if (fileInput.current) fileInput.current.files = dt.files;
    setFileName(f.name);
  }

  async function startRecording() {
    setMicError("");
    const mime = voiceMime();
    if (!navigator.mediaDevices?.getUserMedia || !mime) {
      setMicError("Este navegador não grava áudio. Use o Chrome ou o Safari atualizado.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32_000 });
      chunks.current = [];
      sendAfterStop.current = false;
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        setRec(false);
        if (!sendAfterStop.current || !chunks.current.length) return;
        const type = mime.split(";")[0];
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const file = new File(chunks.current, `audio.${ext}`, { type });
        const dt = new DataTransfer();
        dt.items.add(file);
        if (fileInput.current) fileInput.current.files = dt.files;
        if (voiceFlag.current) voiceFlag.current.value = "1";
        formRef.current?.requestSubmit();
      };
      recorder.current = mr;
      mr.start(500);
      setSecs(0);
      setRec(true);
      timer.current = setInterval(() => {
        setSecs((n) => {
          if (n + 1 >= MAX_VOICE_SECONDS) stopRecording(true);
          return n + 1;
        });
      }, 1000);
    } catch {
      setMicError("Não consegui usar o microfone. Libere a permissão do microfone para este site.");
    }
  }

  function stopRecording(send: boolean) {
    sendAfterStop.current = send;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function pickQuote(q: QuoteOption) {
    setQuote(q);
    setFileName("");
    if (fileInput.current) fileInput.current.value = "";
    // legenda pronta (dá para editar antes de enviar)
    setText(`Olá${firstName ? `, ${firstName}` : ""}! Segue o orçamento nº ${num(q.number)}, no valor de ${brl(q.total)}, válido até ${dmy(q.valid_until)}. Qualquer dúvida, estou à disposição!`);
    setPicker(false);
    setSearch("");
  }

  const term = search.trim().toLowerCase();
  const list = quotes.filter((q) => !term || q.customer_name.toLowerCase().includes(term) || num(q.number).includes(term.replace(/^#/, "")));
  const attached = fileName || quote;

  return (
    <form ref={formRef} action={action} className="min-w-0 bg-[#202c33] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <input type="hidden" name="chatId" value={chatId} />
      <input type="hidden" name="quoteId" value={quote?.id ?? ""} />
      <input ref={voiceFlag} type="hidden" name="voice" defaultValue="" />

      {/* escolher um orçamento já feito */}
      {picker && (
        <div className="absolute inset-0 z-20 flex flex-col bg-[#0b141a]" role="dialog" aria-label="Enviar orçamento">
          <div className="flex shrink-0 items-center gap-2 bg-[#202c33] px-2 py-2">
            <button type="button" aria-label="Fechar" onClick={() => setPicker(false)} className="grid h-10 w-10 place-items-center rounded-full text-[#d1d7db] hover:bg-white/10"><X className="h-6 w-6" /></button>
            <p className="text-[1.05rem] text-[#e9edef]">Enviar orçamento</p>
          </div>
          <div className="shrink-0 p-3">
            <div className="flex min-h-11 items-center gap-2 rounded-lg bg-[#202c33] px-3">
              <Search className="h-4 w-4 shrink-0 text-[#8696a0]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou número" aria-label="Buscar orçamento" className="min-w-0 flex-1 bg-transparent text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]" />
            </div>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto overscroll-contain">
            {list.length === 0 && <li className="p-5 text-sm text-[#8696a0]">Nenhum orçamento encontrado.</li>}
            {list.map((q) => (
              <li key={q.id}>
                <button type="button" onClick={() => pickQuote(q)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#202c33]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00a884]/15 text-[#00a884]"><FileText className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[#e9edef]">#{num(q.number)} · {q.customer_name}</span>
                      <span className="shrink-0 text-sm font-semibold text-[#e9edef]">{brl(q.total)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs text-[#8696a0]">
                      <span>{q.status} · válido até {dmy(q.valid_until)}</span>
                      {q.mine && <span className="shrink-0 rounded-full bg-[#00a884] px-2 py-0.5 font-bold text-[#111b21]">deste cliente</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="no-scrollbar -mx-0.5 mb-2 flex gap-2 overflow-x-auto px-0.5 [@media(max-height:480px)]:hidden">
        {quick.map((q) => (
          <button key={q} type="button" onClick={() => setText(q)} className="shrink-0 rounded-full bg-[#2a3942] px-3 py-1.5 text-xs text-[#d1d7db] hover:bg-[#32454f]">
            {q.length > 30 ? q.slice(0, 28) + "…" : q}
          </button>
        ))}
      </div>

      {attached && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#2a3942] px-3 py-2 text-sm text-[#e9edef]">
          <span className="min-w-0 truncate">
            {quote ? <>📄 Orçamento #{num(quote.number)} · {brl(quote.total)} <span className="text-[#8696a0]">(PDF)</span></> : <>📎 {fileName}</>}
          </span>
          <button type="button" aria-label="Tirar anexo" onClick={() => { setFileName(""); setQuote(null); if (fileInput.current) fileInput.current.value = ""; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {(state.error || micError) && <p className="mb-2 rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{state.error || micError}</p>}

      <div className="relative flex items-end gap-2">
        {/* menu do clipe: arquivo ou orçamento */}
        {menu && (
          <>
            <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
            <div className="absolute bottom-14 left-0 z-20 w-60 overflow-hidden rounded-2xl bg-[#233138] py-2 shadow-xl">
              <button type="button" onClick={() => { setMenu(false); setPicker(true); }} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[#e9edef] hover:bg-white/5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#00a884] text-[#111b21]"><FileText className="h-5 w-5" /></span> Orçamento
              </button>
              <button type="button" onClick={() => { setMenu(false); cameraInput.current?.click(); }} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[#e9edef] hover:bg-white/5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff2e74] text-white"><Camera className="h-5 w-5" /></span> Câmera
              </button>
              <button type="button" onClick={() => { setMenu(false); fileInput.current?.click(); }} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[#e9edef] hover:bg-white/5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7f66ff] text-white"><FileUp className="h-5 w-5" /></span> Arquivo ou foto
              </button>
            </div>
          </>
        )}
        <div className="flex min-h-12 min-w-0 flex-1 items-end rounded-3xl bg-[#2a3942] pl-1">
          <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Anexar" aria-expanded={menu} className="relative z-20 grid h-12 w-11 shrink-0 place-items-center text-[#8696a0] hover:text-[#e9edef]">
            <Paperclip className="h-6 w-6" />
          </button>
          <input
            ref={fileInput}
            name="file"
            type="file"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => attachFile(e.currentTarget.files?.[0])}
          />
          {/* câmera: no celular abre direto a câmera traseira; no computador abre a escolha de foto */}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => { attachFile(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }}
          />
          <textarea
            ref={textArea}
            name="text"
            rows={Math.min(5, Math.max(1, text.split("\n").length, Math.ceil(text.length / 38)))}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem"
            className="max-h-[min(9rem,24dvh)] min-h-12 min-w-0 flex-1 resize-none bg-transparent py-3 pr-4 text-[1rem] text-[#e9edef] outline-none placeholder:text-[#8696a0]"
          />
        </div>
        {/* sem texto nem anexo, o botão vira microfone (como no WhatsApp) */}
        {!text.trim() && !attached && !pending ? (
          <button type="button" onClick={startRecording} aria-label="Gravar áudio" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#111b21]">
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <button disabled={pending} aria-label="Enviar" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#111b21] transition-opacity disabled:opacity-50">
            <Send className="h-5 w-5" />
          </button>
        )}
        {rec && (
          <div className="absolute inset-0 z-30 flex items-center gap-2 bg-[#202c33]" role="status" aria-label="Gravando áudio">
            <button type="button" aria-label="Descartar gravação" onClick={() => stopRecording(false)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[#ea5c5c] hover:bg-white/10">
              <Trash2 className="h-6 w-6" />
            </button>
            <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-[#ea5c5c]" />
            <span className="min-w-0 flex-1 text-[#e9edef] tabular-nums">{clock(secs)} <span className="text-sm text-[#8696a0]">Gravando…</span></span>
            <button type="button" aria-label="Enviar áudio" onClick={() => stopRecording(true)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#111b21]">
              <Send className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
