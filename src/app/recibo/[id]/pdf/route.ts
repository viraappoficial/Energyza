import { loadReceiptPdf, receiptFileName } from "@/lib/receipt-load";

export const dynamic = "force-dynamic";

// Link "secreto" (UUID do pagamento, não adivinhável), como o do orçamento.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });
  const r = await loadReceiptPdf(id);
  if (!r) return new Response("Não encontrado", { status: 404 });
  return new Response(Buffer.from(r.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${receiptFileName(r.number)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
