import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { business } from "@/lib/config";
import { brl } from "@/lib/format";

export type QuoteData = {
  number: number;
  issued_at: string;
  valid_until: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_document: string;
  address: string;
  zip: string;
  neighborhood: string;
  city: string;
  state: string;
  discount: number;
  surcharge: number;
  notes: string;
};
export type QuoteItemData = { description: string; quantity: number; unit_price: number };

const W = 595.28;
const H = 841.89;
const M = 36;
const GOLD = rgb(0.878, 0.627, 0.188);
const BLACK = rgb(0.07, 0.07, 0.07);
const GRAY = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.85, 0.85, 0.85);

const fmtDate = (d: string) => d.split("-").reverse().join("/");

// Helvetica padrão só tem Latin-1: troca o que não existe por "?"
const safe = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, "?");

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const para of safe(text).split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

export async function buildQuotePdf(q: QuoteData, items: QuoteItemData[]) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Orçamento ${q.number} - ${business.legalName}`);
  pdf.setAuthor(business.legalName);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readFile(path.join(process.cwd(), "public", "logo.png"));
  const logo = await pdf.embedPng(logoBytes);

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H;

  const text = (s: string, x: number, yy: number, size = 9, font = reg, color = BLACK) =>
    page.drawText(safe(s), { x, y: yy, size, font, color });

  // ----- Cabeçalho (faixa preta) -----
  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: H - 100, width: W, height: 100, color: rgb(0, 0, 0) });
    const lh = 84;
    page.drawImage(logo, { x: M, y: H - 92, width: lh * (logo.width / logo.height), height: lh });
    const x = 300;
    text(business.legalName.toUpperCase(), x, H - 38, 15, bold, rgb(1, 1, 1));
    text(`CNPJ: ${business.cnpj}`, x, H - 56, 10, reg, rgb(0.9, 0.9, 0.9));
    text(`Tel/WhatsApp: ${business.phoneDisplay}`, x, H - 70, 10, reg, rgb(0.9, 0.9, 0.9));
    text(business.email, x, H - 84, 10, reg, rgb(0.9, 0.9, 0.9));
    page.drawRectangle({ x: 0, y: H - 104, width: W, height: 4, color: GOLD });
  };
  drawHeader();
  y = H - 130;

  // ----- Faixa nº / datas -----
  page.drawRectangle({ x: M, y: y - 28, width: W - 2 * M, height: 28, borderColor: LINE, borderWidth: 1 });
  const cell = (label: string, value: string, x: number) => {
    text(label, x, y - 18, 8, bold, GRAY);
    text(value, x + bold.widthOfTextAtSize(label, 8) + 6, y - 18, 10, bold);
  };
  cell("ORÇAMENTO Nº", String(q.number).padStart(4, "0"), M + 10);
  cell("EMITIDO EM", fmtDate(q.issued_at), M + 180);
  cell("VÁLIDO ATÉ", fmtDate(q.valid_until), M + 360);
  y -= 52;

  const section = (title: string) => {
    text(title, M, y, 11, bold);
    page.drawLine({ start: { x: M, y: y - 5 }, end: { x: W - M, y: y - 5 }, thickness: 1.5, color: GOLD });
    y -= 22;
  };

  // ----- Cliente -----
  section("CLIENTE");
  const field = (label: string, value: string, x: number, yy: number, maxW: number) => {
    text(label, x, yy, 7, bold, GRAY);
    const line = wrap(value || "-", reg, 10, maxW)[0];
    text(line, x, yy - 11, 10);
  };
  const cw = W - 2 * M;
  field("NOME", q.customer_name, M, y, cw);
  y -= 28;
  field("TELEFONE", q.customer_phone, M, y, 200);
  field("E-MAIL", q.customer_email, M + 220, y, cw - 220);
  y -= 28;
  field("CPF/CNPJ", q.customer_document, M, y, 200);
  field("CEP", q.zip, M + 220, y, 120);
  y -= 28;
  field("ENDEREÇO", q.address, M, y, cw);
  y -= 28;
  field("BAIRRO", q.neighborhood, M, y, 200);
  field("CIDADE", q.city, M + 220, y, 200);
  field("ESTADO", q.state, M + 440, y, 60);
  y -= 34;

  // ----- Itens -----
  section("ORÇAMENTO");
  const cols = { item: M, desc: M + 36, qty: W - M - 170, unit: W - M - 115, total: W - M - 55 };
  const descW = cols.qty - cols.desc - 10;

  const tableHeader = () => {
    page.drawRectangle({ x: M, y: y - 16, width: W - 2 * M, height: 20, color: BLACK });
    const hc = rgb(1, 1, 1);
    text("ITEM", cols.item + 6, y - 10, 8, bold, hc);
    text("DESCRIÇÃO", cols.desc, y - 10, 8, bold, hc);
    text("QTD.", cols.qty, y - 10, 8, bold, hc);
    text("UNIT.", cols.unit, y - 10, 8, bold, hc);
    text("TOTAL", cols.total, y - 10, 8, bold, hc);
    y -= 20;
  };
  tableHeader();

  let subtotal = 0;
  items.forEach((it, i) => {
    const lines = wrap(it.description, reg, 9.5, descW);
    const rowH = Math.max(20, lines.length * 12 + 8);
    if (y - rowH < 170) {
      page = pdf.addPage([W, H]);
      y = H - M;
      tableHeader();
    }
    const lineTotal = it.quantity * it.unit_price;
    subtotal += lineTotal;
    text(String(i + 1), cols.item + 10, y - 13, 9, reg, GRAY);
    lines.forEach((l, k) => text(l, cols.desc, y - 13 - k * 12, 9.5));
    text(String(it.quantity).replace(".", ","), cols.qty, y - 13, 9.5);
    text(brl(it.unit_price), cols.unit, y - 13, 9);
    text(brl(lineTotal), cols.total, y - 13, 9, bold);
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: W - M, y: y - rowH }, thickness: 0.5, color: LINE });
    y -= rowH;
  });

  // ----- Totais -----
  if (y < 190) {
    page = pdf.addPage([W, H]);
    y = H - M;
  }
  y -= 16;
  const total = Math.max(0, subtotal - q.discount + q.surcharge);
  const right = (label: string, value: string, yy: number, size = 10, font = reg) => {
    text(label, W - M - 210, yy, size, font);
    const vw = font.widthOfTextAtSize(value, size);
    text(value, W - M - vw, yy, size, font);
  };
  right("Subtotal", brl(subtotal), y);
  right("Desconto", `- ${brl(q.discount)}`, y - 15);
  right("Acréscimo", `+ ${brl(q.surcharge)}`, y - 30);
  page.drawRectangle({ x: W - M - 220, y: y - 66, width: 220, height: 28, color: BLACK });
  text("TOTAL", W - M - 210, y - 56, 11, bold, rgb(1, 1, 1));
  const tv = brl(total);
  text(tv, W - M - 10 - bold.widthOfTextAtSize(tv, 13), y - 57, 13, bold, GOLD);

  // ----- Observações -----
  if (q.notes.trim()) {
    text("OBSERVAÇÕES", M, y, 8, bold, GRAY);
    wrap(q.notes, reg, 9, 280)
      .slice(0, 8)
      .forEach((l, k) => text(l, M, y - 13 - k * 11, 9));
  }

  text(
    `${business.legalName} · ${business.phoneDisplay} · ${business.email}`,
    M,
    24,
    8,
    reg,
    GRAY,
  );
  return pdf.save();
}
