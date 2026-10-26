"use client";

import { useEffect, useRef, useState } from "react";
import { brl } from "@/lib/format";
import { business } from "@/lib/config";

export type PreviewData = {
  number?: number;
  issuedAt: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  zip: string;
  neighborhood: string;
  city: string;
  state: string;
  items: { description: string; quantity: number; unit_price: number }[];
  discount: number;
  surcharge: number;
  notes: string;
};

const fmtDate = (d: string) => (d ? d.split("-").reverse().join("/") : "");
const PAGE_W = 595;
const PAGE_H = 842;

// Página A4 (595x842) escalada para caber na coluna, imitando o PDF gerado.
export function QuotePreview({ data }: { data: PreviewData }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(PAGE_H * 0.6);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const s = Math.min(1, o.clientWidth / PAGE_W);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  const subtotal = data.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const total = Math.max(0, subtotal - data.discount + data.surcharge);
  const field = (label: string, value: string) => (
    <div className="min-w-0">
      <div className="text-[7px] font-bold uppercase text-neutral-500">{label}</div>
      <div className="truncate text-[10px]">{value || "-"}</div>
    </div>
  );

  return (
    <div ref={outer} className="w-full overflow-hidden rounded-lg border border-border bg-neutral-300" style={{ height }}>
      <div
        ref={inner}
        className="origin-top-left bg-white text-neutral-900"
        style={{ width: PAGE_W, minHeight: PAGE_H, transform: `scale(${scale})` }}
      >
        {/* cabeçalho */}
        <div className="relative flex h-[100px] items-center bg-black px-9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-[84px] w-auto" />
          <div className="ml-auto mr-[40px] w-[255px] text-white">
            <div className="text-[15px] font-bold">{business.legalName.toUpperCase()}</div>
            <div className="mt-1 text-[10px] leading-[14px] text-neutral-200">
              CNPJ: {business.cnpj}
              <br />
              Tel: {business.phoneDisplay} · WhatsApp: {business.whatsappDisplay}
              <br />
              {business.email}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-[#e0a030]" />
        </div>

        <div className="px-9 pt-6">
          <div className="flex justify-between rounded border border-neutral-300 px-3 py-2 text-[10px]">
            <span><b className="text-[8px] text-neutral-500">ORÇAMENTO Nº </b><b>{data.number ? String(data.number).padStart(4, "0") : "—"}</b></span>
            <span><b className="text-[8px] text-neutral-500">EMITIDO EM </b><b>{fmtDate(data.issuedAt)}</b></span>
            <span><b className="text-[8px] text-neutral-500">VÁLIDO ATÉ </b><b>{fmtDate(data.validUntil)}</b></span>
          </div>

          <div className="mt-5 border-b-[1.5px] border-[#e0a030] pb-1 text-[11px] font-bold">CLIENTE</div>
          <div className="mt-3 grid gap-y-3 gap-x-4">
            {field("NOME", data.name)}
            <div className="grid grid-cols-2 gap-4">{field("TELEFONE", data.phone)}{field("E-MAIL", data.email)}</div>
            <div className="grid grid-cols-2 gap-4">{field("CPF/CNPJ", data.document)}{field("CEP", data.zip)}</div>
            {field("ENDEREÇO", data.address)}
            <div className="grid grid-cols-[1fr_1fr_60px] gap-4">
              {field("BAIRRO", data.neighborhood)}{field("CIDADE", data.city)}{field("ESTADO", data.state)}
            </div>
          </div>

          <div className="mt-6 border-b-[1.5px] border-[#e0a030] pb-1 text-[11px] font-bold">ORÇAMENTO</div>
          <table className="mt-3 w-full border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-neutral-900 text-left text-[8px] text-white">
                <th className="px-2 py-1.5 font-bold">ITEM</th>
                <th className="py-1.5 font-bold">DESCRIÇÃO</th>
                <th className="py-1.5 font-bold">QTD.</th>
                <th className="py-1.5 font-bold">UNIT.</th>
                <th className="py-1.5 pr-2 text-right font-bold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-neutral-400">Adicione itens ao orçamento</td></tr>
              )}
              {data.items.map((it, i) => (
                <tr key={i} className="border-b border-neutral-200 align-top">
                  <td className="px-2 py-1.5 text-neutral-500">{i + 1}</td>
                  <td className="py-1.5 pr-2">{it.description}</td>
                  <td className="py-1.5">{String(it.quantity).replace(".", ",")}</td>
                  <td className="py-1.5">{brl(it.unit_price)}</td>
                  <td className="py-1.5 pr-2 text-right font-bold">{brl(it.quantity * it.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 flex items-start justify-between gap-6 pb-16">
            <div className="max-w-[280px] text-[9px]">
              {data.notes.trim() && (
                <>
                  <div className="text-[8px] font-bold text-neutral-500">OBSERVAÇÕES</div>
                  <div className="whitespace-pre-line">{data.notes}</div>
                </>
              )}
            </div>
            <div className="w-[220px] text-[10px]">
              <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
              <div className="mt-1 flex justify-between"><span>Desconto</span><span>- {brl(data.discount)}</span></div>
              <div className="mt-1 flex justify-between"><span>Acréscimo</span><span>+ {brl(data.surcharge)}</span></div>
              <div className="mt-2 flex items-center justify-between bg-neutral-900 px-2.5 py-2 text-white">
                <b className="text-[11px]">TOTAL</b>
                <b className="text-[13px] text-[#e0a030]">{brl(total)}</b>
              </div>
            </div>
          </div>
        </div>
        <div className="px-9 pb-4 text-[8px] text-neutral-500">
          {business.legalName} · {business.phoneDisplay} · {business.email}
        </div>
      </div>
    </div>
  );
}
