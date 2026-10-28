import { z } from "zod";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Arquivos das conversas: só quem está logado no painel consegue abrir
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("not found", { status: 404 });
  const [m] = await sql<{ mime: string; name: string; data: Buffer }[]>`select mime, name, data from wa_media where id = ${id}`;
  if (!m) return new Response("not found", { status: 404 });
  // PDF de verdade (começa com %PDF): o leitor do Chrome não abre em página com CSP "sandbox", então fica sem ele.
  // Seguro mesmo assim: Content-Type application/pdf + nosniff nunca é interpretado como HTML.
  const isPdf = /^application\/pdf/.test(m.mime) && Buffer.from(m.data.subarray(0, 5)).toString("latin1").startsWith("%PDF");
  const safe = isPdf || /^(image\/(png|jpe?g|gif|webp)|audio\/|video\/)/.test(m.mime);
  return new Response(new Uint8Array(m.data), {
    headers: {
      "Content-Type": safe ? m.mime : "application/octet-stream",
      "Content-Disposition": `${safe ? "inline" : "attachment"}; filename="${encodeURIComponent(m.name || "arquivo")}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": isPdf
        ? "frame-ancestors 'self'"
        : "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
