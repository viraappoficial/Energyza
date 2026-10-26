// formatação de telefone e hora para as telas de conversa
export function fmtPhone(d: string) {
  const n = d.replace(/\D/g, "").replace(/^55/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return d;
}

const tz = "America/Sao_Paulo";
export function fmtWhen(d: Date | string) {
  const date = new Date(d);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
  const now = new Date();
  const hm = date.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  if (day(date) === day(now)) return hm;
  if (day(date) === day(new Date(now.getTime() - 86_400_000))) return `ontem ${hm}`;
  return `${date.toLocaleDateString("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" })} ${hm}`;
}

// hora da mensagem (HH:MM, Brasília)
export const fmtHM = (d: Date | string) =>
  new Date(d).toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

// chave do dia (AAAA-MM-DD, Brasília) e rótulo "Hoje" / "Ontem" / data
export const waDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: tz });
export function waDayLabel(key: string) {
  const today = waDay(new Date());
  const yesterday = waDay(new Date(Date.now() - 86_400_000));
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

// iniciais para o avatar
export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "#";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
