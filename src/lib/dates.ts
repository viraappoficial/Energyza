// Datas no horário de Brasília (UTC-3), usadas no painel (servidor e navegador).
export const DAY_MS = 86_400_000;

export const dayKey = (d: Date | string) =>
  new Date(new Date(d).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
export const startOfDay = (key: string) => new Date(`${key}T00:00:00-03:00`);
export const addDays = (key: string, n: number) =>
  new Date(Date.parse(`${key}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

export const fmtTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
export const fmtLongDay = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
