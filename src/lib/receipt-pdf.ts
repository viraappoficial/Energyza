import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { business } from "@/lib/config";
import { brl } from "@/lib/format";
import { reaisPorExtenso } from "@/lib/money-words";
import { fmtDate, safe, wrap } from "@/lib/quote-pdf";

export type ReceiptData = {
  number: string; // ex.: 0012-02 (orçamento + ordem do pagamento)
  paidAt: string; // AAAA-MM-DD
  amount: number;
  method: string;
  quoteNumber: number;
  customerName: string;
  customerDocument: string;
  description: string; // serviços do orçamento
  total: number;
  paidUntil: number; // pago até este recibo (inclusive)
  due: string | null;
};

const METHOD: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", transferencia: "Transferência", outro: "Outro" };
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const longDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${day} de ${MONTHS[m - 1]} de ${y}`;
};

// A5 retrato: lê bem no celular
const W = 419.53;
const H = 595.28;
const M = 28;
const GOLD = rgb(0.878, 0.627, 0.188);
const BLACK = rgb(0.07, 0.07, 0.07);
const GRAY = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.85, 0.85, 0.85);
const GREEN = rgb(0.1, 0.5, 0.34);
const BLUE = rgb(0.16, 0.42, 0.68);

export async function buildReceiptPdf(r: ReceiptData) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Recibo ${r.number} - ${business.legalName}`);
  pdf.setAuthor(business.legalName);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ital = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "logo.png")));
  const stamp = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "carimbo-energyza.png")));

  const page = pdf.addPage([W, H]);
  const text = (s: string, x: number, y: number, size = 9, font = reg, color = BLACK) => page.drawText(safe(s), { x, y, size, font, color });
  const center = (s: string, y: number, size: number, font = reg, color = BLACK, cx = W / 2) =>
    text(s, cx - font.widthOfTextAtSize(safe(s), size) / 2, y, size, font, color);

  // ----- cabeçalho -----
  const HEAD = 88;
  page.drawRectangle({ x: 0, y: H - HEAD, width: W, height: HEAD, color: rgb(0, 0, 0) });
  const lh = 70;
  page.drawImage(logo, { x: M, y: H - HEAD + 9, width: lh * (logo.width / logo.height), height: lh });
  const hx = 196;
  text(business.legalName.toUpperCase(), hx, H - 30, 12, bold, rgb(1, 1, 1));
  text(`CNPJ: ${business.cnpj}`, hx, H - 46, 8.5, reg, rgb(0.9, 0.9, 0.9));
  text(`Tel/WhatsApp: ${business.phoneDisplay}`, hx, H - 58, 8.5, reg, rgb(0.9, 0.9, 0.9));
  text(business.email, hx, H - 70, 8.5, reg, rgb(0.9, 0.9, 0.9));
  page.drawRectangle({ x: 0, y: H - HEAD - 4, width: W, height: 4, color: GOLD });

  // ----- título e número -----
  let y = H - HEAD - 38;
  text("RECIBO", M, y, 30, bold, BLACK);
  page.drawRectangle({ x: M, y: y - 9, width: 56, height: 3, color: GOLD });
  const rn = `Nº ${r.number}`;
  text(rn, W - M - bold.widthOfTextAtSize(rn, 13), y + 12, 13, bold, BLACK);
  const dt = fmtDate(r.paidAt);
  text(dt, W - M - reg.widthOfTextAtSize(dt, 10), y - 2, 10, reg, GRAY);
  y -= 24;

  // ----- caixa do valor (cantos dourados, igual ao painel) -----
  const bh = 60;
  const bw = W - 2 * M;
  page.drawRectangle({ x: M, y: y - bh, width: bw, height: bh, color: BLACK });
  const corner = (x: number, yy: number, dx: number, dy: number) => {
    page.drawLine({ start: { x, y: yy }, end: { x: x + dx * 14, y: yy }, thickness: 2, color: GOLD });
    page.drawLine({ start: { x, y: yy }, end: { x, y: yy + dy * 14 }, thickness: 2, color: GOLD });
  };
  corner(M, y, 1, -1);
  corner(M + bw, y - bh, -1, 1);
  text("VALOR RECEBIDO", M + 16, y - 18, 8, bold, rgb(0.75, 0.6, 0.35));
  text(brl(r.amount), M + 16, y - 46, 28, bold, GOLD);
  y -= bh + 14;

  const words = reaisPorExtenso(r.amount);
  wrap(`(${words.charAt(0).toUpperCase()}${words.slice(1)})`, ital, 9.5, bw).forEach((l, i) => text(l, M, y - i * 12, 9.5, ital, GRAY));
  y -= wrap(`(${words})`, ital, 9.5, bw).length * 12 + 8;

  // ----- texto do recibo -----
  const who = r.customerDocument ? `${r.customerName} (CPF/CNPJ ${r.customerDocument})` : r.customerName;
  const desc = r.description ? `, referente a: ${r.description}` : "";
  const body = `Recebemos de ${who} a quantia acima${desc}, conforme orçamento nº ${String(r.quoteNumber).padStart(4, "0")}.`;
  wrap(body, reg, 10, bw).forEach((l, i) => text(l, M, y - i * 13.5, 10));
  y -= wrap(body, reg, 10, bw).length * 13.5 + 8;

  // ----- forma / data / orçamento -----
  const field = (label: string, value: string, x: number) => {
    text(label, x, y, 7, bold, GRAY);
    text(value, x, y - 12, 10.5, bold);
  };
  field("FORMA DE PAGAMENTO", METHOD[r.method] ?? "Não informada", M);
  field("DATA DO PAGAMENTO", fmtDate(r.paidAt), M + 150);
  field("ORÇAMENTO", `Nº ${String(r.quoteNumber).padStart(4, "0")}`, M + 290);
  y -= 26;

  // ----- situação do orçamento -----
  const left = Math.max(0, Math.round((r.total - r.paidUntil) * 100) / 100);
  const settled = left === 0;
  const sh = settled ? 60 : 76;
  page.drawRectangle({ x: M, y: y - sh, width: bw, height: sh, borderColor: LINE, borderWidth: 1 });
  const tag = settled ? "ORÇAMENTO QUITADO" : "PAGAMENTO PARCIAL";
  const tc = settled ? GREEN : BLUE;
  const tw = bold.widthOfTextAtSize(tag, 8.5) + 20;
  page.drawRectangle({ x: M + 12, y: y - 24, width: tw, height: 16, color: tc });
  text(tag, M + 22, y - 19, 8.5, bold, rgb(1, 1, 1));
  const row = (label: string, value: string, yy: number, strong = false) => {
    text(label, M + 12, yy, 9, reg, GRAY);
    text(value, W - M - 12 - (strong ? bold : reg).widthOfTextAtSize(value, 9.5), yy, 9.5, strong ? bold : reg, strong ? tc : BLACK);
  };
  row("Total do orçamento", brl(r.total), y - 40);
  row("Pago até este recibo", brl(r.paidUntil), y - 53);
  if (!settled) {
    row("Saldo restante", brl(left), y - 66, true);
    if (r.due) text(`previsto para ${fmtDate(r.due)}`, M + 12 + tw + 10, y - 19, 8, reg, GRAY);
  }
  y -= sh + 20;

  // ----- assinatura com carimbo (fica sobre a linha, sem cobrir texto) -----
  const sig = 100;
  text(`Maringá/PR, ${longDate(r.paidAt)}`, M, sig + 2, 9, reg, GRAY);
  const sx = W - M - 175;
  page.drawLine({ start: { x: sx, y: sig - 34 }, end: { x: W - M, y: sig - 34 }, thickness: 0.8, color: BLACK });
  center(business.legalName, sig - 46, 9, bold, BLACK, sx + 87.5);
  center(`CNPJ ${business.cnpj}`, sig - 57, 7.5, reg, GRAY, sx + 87.5);
  const ss = 96;
  page.drawImage(stamp, { x: sx + 87.5 - ss / 2, y: sig - 30, width: ss, height: ss, opacity: 0.92 });

  // ----- rodapé -----
  text("Recibo de pagamento. Não substitui nota fiscal.", M, 26, 7.5, reg, GRAY);
  page.drawRectangle({ x: 0, y: 0, width: W, height: 8, color: GOLD });
  return pdf.save();
}
