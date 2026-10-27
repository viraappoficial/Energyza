export const business = {
  name: "Energyza",
  tagline: "Soluções em Elétrica",
  legalName: "Energyza Elétrica",
  cnpj: "66.846.851/0001-68",
  phoneDisplay: "(44) 99178-3132",
  whatsapp: "5544991783132",
  email: "energyzaeletrica@hotmail.com",
  instagram: "https://www.instagram.com/energyzaeletrica",
  instagramHandle: "@energyzaeletrica",
  reviewUrl: "https://g.page/r/CRCYAbnpOxy6EBM/review",
  city: "Maringá",
  state: "PR",
  certifications: ["NR-10", "NR-35"],
} as const;

export function whatsappLink(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${business.whatsapp}${text}`;
}

export function reviewMessage(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return `Olá${first ? `, ${first}` : ""}! Obrigado por escolher a Energyza Elétrica. Se gostou do serviço, pode nos avaliar no Google em 1 minuto? ${business.reviewUrl}\nIsso ajuda muito o nosso trabalho.`;
}

// Maringá/PR: UTC-3 o ano todo (sem horário de verão)
export const TZ_OFFSET = "-03:00";
export const SLOT_STEP_MINUTES = 30;
export const MIN_LEAD_HOURS = 2;
export const MAX_DAYS_AHEAD = 60;
