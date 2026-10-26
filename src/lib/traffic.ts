// Regras do gestor de tráfego (classificação de origem e período). Sem acesso ao banco aqui.
import { addDays, dayKey } from "@/lib/dates";

export type Attribution = Record<string, string> | null | undefined;

export type Origin = { key: string; label: string; channel: "google" | "meta" | null; paid: boolean };

const META_SOURCES = ["facebook", "fb", "instagram", "ig", "meta"];

// De onde veio o lead, a partir do que o site guardou (gclid, fbclid, utm_*, referrer)
export function originOf(a: Attribution): Origin {
  const at = a ?? {};
  const src = (at.utm_source ?? "").toLowerCase();
  const medium = (at.utm_medium ?? "").toLowerCase();
  const paidMedium = ["cpc", "ppc", "paid", "paidsocial", "paid_social", "ads"].includes(medium);

  if (at.gclid || at.gbraid || at.wbraid || (src === "google" && paidMedium))
    return { key: "google_ads", label: "Google Ads", channel: "google", paid: true };
  if (at.fbclid || (META_SOURCES.includes(src) && paidMedium))
    return { key: "meta_ads", label: "Meta Ads", channel: "meta", paid: true };
  if (META_SOURCES.includes(src)) return { key: "meta_org", label: "Instagram/Facebook (orgânico)", channel: null, paid: false };
  if (src) return { key: `src_${src}`, label: src, channel: null, paid: false };
  const ref = (at.referrer ?? "").toLowerCase();
  if (ref.includes("google.")) return { key: "google_org", label: "Google (orgânico)", channel: null, paid: false };
  if (ref) return { key: `ref_${ref}`, label: ref, channel: null, paid: false };
  return { key: "direto", label: "Direto / WhatsApp", channel: null, paid: false };
}

export const CHANNEL_LABEL: Record<string, string> = { google: "Google Ads", meta: "Meta Ads", outro: "Outros" };

export type PeriodKey = "7" | "30" | "mes" | "tudo";
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "mes", label: "Este mês" },
  { key: "tudo", label: "Tudo" },
];

// intervalo [from, to] em "AAAA-MM-DD" (Brasília), incluindo hoje
export function periodRange(p: PeriodKey, now = new Date()) {
  const to = dayKey(now);
  if (p === "7") return { from: addDays(to, -6), to };
  if (p === "30") return { from: addDays(to, -29), to };
  if (p === "mes") return { from: `${to.slice(0, 7)}-01`, to };
  return { from: "2000-01-01", to };
}

export const safe = (n: number, d: number) => (d > 0 ? n / d : 0);
