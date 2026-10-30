"use client";

import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";
import { CONSENT_KEY, captureAttribution, track } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-18533614199";
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Consent = "granted" | "denied" | null;

function subscribe(cb: () => void) {
  window.addEventListener("energyza-consent", cb);
  return () => window.removeEventListener("energyza-consent", cb);
}
function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function setConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignora
  }
  window.gtag?.("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
  window.fbq?.("consent", value === "granted" ? "grant" : "revoke");
  window.dispatchEvent(new Event("energyza-consent"));
}

// "Interno" = dono/equipe: não entra nas contagens (Analytics, Pixel e conversões). O painel nunca conta, e o
// navegador em que alguém abre o painel fica marcado. Em outro aparelho: abrir o site com ?interno=1 (desfazer: ?interno=0).
const INTERNAL_KEY = "energyza_interno";
type Counting = "pending" | "on" | "off";
function getCounting(): Counting {
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("interno");
    if (q === "1") localStorage.setItem(INTERNAL_KEY, "1");
    if (q === "0") localStorage.removeItem(INTERNAL_KEY);
    if (url.pathname.startsWith("/admin") || url.hostname.startsWith("painel.")) localStorage.setItem(INTERNAL_KEY, "1");
    return localStorage.getItem(INTERNAL_KEY) === "1" ? "off" : "on";
  } catch {
    return "on";
  }
}
const subscribeNone = () => () => {};

export function Analytics() {
  const consent = useSyncExternalStore(subscribe, getConsent, () => "denied" as Consent);
  const counting = useSyncExternalStore(subscribeNone, getCounting, () => "pending" as Counting);
  const on = counting === "on";
  const hasTags = Boolean(GA_ID || ADS_ID || PIXEL_ID);

  useEffect(() => {
    captureAttribution();
    // clique em WhatsApp / telefone / e-mail = contato
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a");
      const href = a?.getAttribute("href") ?? "";
      if (/wa\.me|api\.whatsapp\.com|^tel:|^mailto:/.test(href)) {
        track("contact", { method: href.startsWith("tel:") ? "telefone" : href.startsWith("mailto:") ? "email" : "whatsapp" });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const googleId = GA_ID ?? ADS_ID;
  const googleConfig = [GA_ID, ADS_ID].filter(Boolean).map((id) => `gtag('config','${id}');`).join("");

  return (
    <>
      {on && googleId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleId}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments)}
            window.gtag=gtag;
            var c=null;try{c=localStorage.getItem('${CONSENT_KEY}')}catch(e){}
            var g=c==='granted'?'granted':'denied';
            gtag('consent','default',{ad_storage:g,ad_user_data:g,ad_personalization:g,analytics_storage:g,wait_for_update:500});
            gtag('js',new Date());${googleConfig}
          `}</Script>
        </>
      )}
      {on && PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          var c=null;try{c=localStorage.getItem('${CONSENT_KEY}')}catch(e){}
          fbq('consent',c==='granted'?'grant':'revoke');
          fbq('init','${PIXEL_ID}');fbq('track','PageView');
        `}</Script>
      )}

      {on && hasTags && consent === null && (
        <div role="dialog" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            <p className="min-w-60 flex-1 text-sm text-muted">
              Usamos cookies para medir o uso do site e melhorar nossos anúncios.{" "}
              <a href="/privacidade" className="text-gold underline">Política de privacidade</a>.
            </p>
            <button onClick={() => setConsent("denied")} className="btn btn-outline !py-2 text-sm">Recusar</button>
            <button onClick={() => setConsent("granted")} className="btn btn-gold !py-2 text-sm">Aceitar</button>
          </div>
        </div>
      )}
    </>
  );
}
