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
  city: "Maringá",
  state: "PR",
  certifications: ["NR-10", "NR-35"],
} as const;

export function whatsappLink(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${business.whatsapp}${text}`;
}

// Maringá/PR: UTC-3 o ano todo (sem horário de verão)
export const TZ_OFFSET = "-03:00";
export const SLOT_STEP_MINUTES = 30;
export const MIN_LEAD_HOURS = 2;
export const MAX_DAYS_AHEAD = 60;
