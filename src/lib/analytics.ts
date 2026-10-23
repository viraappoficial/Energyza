// Eventos de conversão (client-side). Só disparam se as tags estiverem carregadas.
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const CONSENT_KEY = "energyza_consent";
export const ATTR_KEY = "energyza_attr";

// lead = agendamento enviado; contact = clique no WhatsApp/telefone/e-mail
export function track(event: "lead" | "contact", params: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  if (event === "lead") {
    window.gtag?.("event", "generate_lead", params);
    window.fbq?.("track", "Lead", params);
  } else {
    window.gtag?.("event", "contact", params);
    window.fbq?.("track", "Contact", params);
  }
}

const ATTR_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "gbraid", "wbraid", "fbclid",
];

// Guarda de onde o visitante veio (UTM/gclid/fbclid) para ligar o agendamento ao anúncio.
export function captureAttribution() {
  try {
    const url = new URL(window.location.href);
    const found: Record<string, string> = {};
    for (const k of ATTR_PARAMS) {
      const v = url.searchParams.get(k);
      if (v) found[k] = v.slice(0, 200);
    }
    if (Object.keys(found).length > 0) {
      localStorage.setItem(ATTR_KEY, JSON.stringify({ ...found, landing: url.pathname }));
    } else if (!localStorage.getItem(ATTR_KEY) && document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.hostname !== window.location.hostname) {
        localStorage.setItem(
          ATTR_KEY,
          JSON.stringify({ referrer: ref.hostname, landing: url.pathname }),
        );
      }
    }
  } catch {
    // localStorage bloqueado: segue sem atribuição
  }
}

export function getAttribution(): string {
  try {
    return localStorage.getItem(ATTR_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}
