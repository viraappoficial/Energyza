// Pix "copia e cola" (BR Code estático do Banco Central) com o valor já preenchido.
const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

// CRC16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF), exigido no fim do código
export function crc16(text: string) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// CPF/CNPJ vão só com dígitos; e-mail em minúsculas; o resto (celular +55…, chave aleatória) como está
export function normalizePixKey(raw: string) {
  const k = raw.trim();
  if (!k) return "";
  if (k.includes("@")) return k.toLowerCase();
  const digits = k.replace(/\D/g, "");
  if (/^[\d.\-/\s]+$/.test(k) && (digits.length === 11 || digits.length === 14)) return digits;
  return k;
}

// só ASCII, sem acento, em maiúsculas (o Pix exige), cortado no limite do campo
// (se passar do limite, corta numa palavra inteira, para não aparecer "ROQUE D" no app do banco)
const ascii = (s: string, max: number) => {
  const t = s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > 0 ? cut.slice(0, sp) : t.slice(0, max)).trim();
};

export function pixPayload({ key, name, city, amount }: { key: string; name: string; city: string; amount?: number }) {
  const k = normalizePixKey(key);
  const account = tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", k));
  const value = amount && amount > 0 ? tlv("54", amount.toFixed(2)) : "";
  const body =
    tlv("00", "01") + tlv("01", "11") + account + tlv("52", "0000") + tlv("53", "986") + value +
    tlv("58", "BR") + tlv("59", ascii(name, 25) || "RECEBEDOR") + tlv("60", ascii(city, 15) || "BRASIL") + tlv("62", tlv("05", "***")) + "6304";
  return body + crc16(body);
}
