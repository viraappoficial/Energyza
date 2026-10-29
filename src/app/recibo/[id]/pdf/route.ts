import { z } from "zod";
import { allow, clientIp } from "@/lib/rate-limit";
import { loadReceiptPdf, receiptFileName } from "@/lib/receipt-load";

export const dynamic = "force-dynamic";

// Link "secreto" (UUID do pagamento, não adivinhável), como o do orçamento.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Não encontrado", { status: 404 });
  if (!(await allow(`pdf:${await clientIp()}`, 40, 60))) return new Response("Muitas requisições", { status: 429, headers: { "Retry-After": "60" } });
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
