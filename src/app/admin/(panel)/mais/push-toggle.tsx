"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Download, Send } from "lucide-react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "../../actions";

type State = "carregando" | "sem-suporte" | "iphone-instalar" | "bloqueado" | "desligado" | "ligado";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

type InstallEvent = Event & { prompt: () => Promise<void> };

// Ativar notificações neste aparelho e instalar o painel como app
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("carregando");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const installEvt = useRef<InstallEvent | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const standalone = (navigator as unknown as { standalone?: boolean }).standalone || matchMedia("(display-mode: standalone)").matches;
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let next: State;
      if (!supported) next = ios && !standalone ? "iphone-instalar" : "sem-suporte";
      else if (Notification.permission === "denied") next = "bloqueado";
      else {
        const reg = await navigator.serviceWorker.getRegistration("/admin/");
        const sub = await reg?.pushManager.getSubscription();
        next = sub && Notification.permission === "granted" ? "ligado" : "desligado";
      }
      if (alive) setState(next);
    })();
    const onPrompt = (e: Event) => { e.preventDefault(); installEvt.current = e as InstallEvent; setCanInstall(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => { alive = false; window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "bloqueado" : "desligado"); return; }
      const reg = await navigator.serviceWorker.register("/sw-painel.js", { scope: "/admin/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription(json, navigator.userAgent);
      if (!r.ok) throw new Error(r.error);
      setState("ligado");
      setMsg("Pronto! Este aparelho vai receber os avisos.");
    } catch {
      setMsg("Não foi possível ativar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/admin/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
      setState("desligado");
      setMsg("");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    const r = await sendTestPush();
    setMsg("error" in r && r.error ? r.error : "Teste enviado. Em instantes aparece a notificação.");
    setBusy(false);
  }

  async function install() {
    await installEvt.current?.prompt();
    setCanInstall(false);
  }

  const card = "edge-card p-4";
  return (
    <div className={card}>
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
          {state === "ligado" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Notificações no celular</p>
          <p className="text-sm text-muted">
            {state === "ligado" && "Ativas neste aparelho: você é avisado de mensagem nova e de agendamento."}
            {state === "desligado" && "Receba um aviso no celular a cada mensagem de cliente e novo agendamento."}
            {state === "carregando" && "Verificando…"}
            {state === "bloqueado" && "As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador (cadeado ao lado do endereço) e volte aqui."}
            {state === "sem-suporte" && "Este navegador não permite notificações. Use o Chrome (Android) ou o Safari com o painel instalado (iPhone)."}
            {state === "iphone-instalar" && "No iPhone: toque em Compartilhar, depois em “Adicionar à Tela de Início”. Abra o app Energyza que aparece lá e ative aqui."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state === "desligado" && <button onClick={enable} disabled={busy} className="btn btn-gold !px-4 !py-2 text-sm"><Bell className="h-4 w-4" /> Ativar notificações</button>}
        {state === "ligado" && (
          <>
            <button onClick={test} disabled={busy} className="btn btn-outline !px-4 !py-2 text-sm"><Send className="h-4 w-4" /> Enviar teste</button>
            <button onClick={disable} disabled={busy} className="btn btn-outline !px-4 !py-2 text-sm">Desativar</button>
          </>
        )}
        {canInstall && <button onClick={install} className="btn btn-outline !px-4 !py-2 text-sm"><Download className="h-4 w-4" /> Instalar app</button>}
      </div>
      {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
    </div>
  );
}
