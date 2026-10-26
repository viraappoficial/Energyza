import { loadQuotePdf, quoteFileName } from "@/lib/quote-load";

export const dynamic = "force-dynamic";

// Link "secreto" (UUID não adivinhável) que o cliente recebe pelo WhatsApp.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });

  const q = await loadQuotePdf(id);
  if (!q) return new Response("Não encontrado", { status: 404 });

  return new Response(Buffer.from(q.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${quoteFileName(q.number)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
