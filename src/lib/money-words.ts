// Valor por extenso em reais (ex.: 1850.5 -> "mil oitocentos e cinquenta reais e cinquenta centavos")
const U = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const D = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

// 1..999
function upTo999(n: number) {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(C[c]);
  if (r) {
    if (r < 20) parts.push(U[r]);
    else parts.push(r % 10 ? `${D[Math.floor(r / 10)]} e ${U[r % 10]}` : D[Math.floor(r / 10)]);
  }
  return parts.join(" e ");
}

function integerWords(n: number) {
  if (n === 0) return "zero";
  const mi = Math.floor(n / 1_000_000);
  const mil = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const groups: { text: string; value: number }[] = [];
  if (mi) groups.push({ text: mi === 1 ? "um milhão" : `${upTo999(mi)} milhões`, value: mi * 1_000_000 });
  if (mil) groups.push({ text: mil === 1 ? "mil" : `${upTo999(mil)} mil`, value: mil * 1000 });
  if (rest) groups.push({ text: upTo999(rest), value: rest });
  // "e" antes do último grupo só quando ele é menor que 100 ou múltiplo de 100 (mil e um, mil e quinhentos; mil oitocentos e cinquenta)
  return groups
    .map((g, i) => {
      if (i === 0) return g.text;
      const last = i === groups.length - 1;
      const v = g.value >= 1000 ? g.value / 1000 : g.value;
      return (last && (v < 100 || v % 100 === 0) ? "e " : "") + g.text;
    })
    .join(" ");
}

export function reaisPorExtenso(value: number) {
  const cents = Math.round(Math.max(0, value) * 100);
  const reais = Math.floor(cents / 100);
  const c = cents % 100;
  const parts: string[] = [];
  if (reais > 0 || c === 0) {
    const de = reais >= 1_000_000 && reais % 1_000_000 === 0 ? " de" : "";
    parts.push(`${integerWords(reais)}${de} ${reais === 1 ? "real" : "reais"}`);
  }
  if (c > 0) parts.push(`${integerWords(c)} ${c === 1 ? "centavo" : "centavos"}`);
  return parts.join(" e ");
}
