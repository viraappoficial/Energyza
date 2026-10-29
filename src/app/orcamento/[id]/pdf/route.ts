import { z } from "zod";
import { allow, clientIp } from "@/lib/rate-limit";
import { chargeFileName, loadQuotePdf, quoteFileName } from "@/lib/quote-load";

export const dynamic = "force-dynamic";

// Link "secreto" (UUID não adivinhável) que o cliente recebe pelo WhatsApp.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Não encontrado", { status: 404 });
  if (!(await allow(`pdf:${await clientIp()}`, 40, 60))) return new Response("Muitas requisições", { status: 429, headers: { "Retry-After": "60" } });

  const url = new URL(req.url);
  const q = await loadQuotePdf(id, { charge: url.searchParams.has("cobranca") });
  if (!q) return new Response("Não encontrado", { status: 404 });

  return new Response(Buffer.from(q.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${(q.charged ? chargeFileName : quoteFileName)(q.number)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
