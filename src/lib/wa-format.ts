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
