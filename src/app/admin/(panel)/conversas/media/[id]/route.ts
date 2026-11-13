import { z } from "zod";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Arquivos das conversas: só quem está logado no painel consegue abrir
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("not found", { status: 404 });
  const [m] = await sql<{ mime: string; name: string; data: Buffer }[]>`select mime, name, data from wa_media where id = ${id}`;
  if (!m) return new Response("not found", { status: 404 });
  // PDF de verdade (começa com %PDF): o leitor do Chrome não abre em página com CSP "sandbox", então fica sem ele.
  // Seguro mesmo assim: Content-Type application/pdf + nosniff nunca é interpretado como HTML.
  const isPdf = /^application\/pdf/.test(m.mime) && Buffer.from(m.data.subarray(0, 5)).toString("latin1").startsWith("%PDF");
  const safe = isPdf || /^(image\/(png|jpe?g|gif|webp)|audio\/|video\/)/.test(m.mime);
  const headers: Record<string, string> = {
    "Content-Type": safe ? m.mime : "application/octet-stream",
    "Content-Disposition": `${safe ? "inline" : "attachment"}; filename="${encodeURIComponent(m.name || "arquivo")}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": isPdf
      ? "frame-ancestors 'self'"
      : "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  };
  // vídeo no iPhone só toca se o servidor entregar o arquivo por pedaços (Range); o Chrome também usa para avançar
  const total = m.data.length;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (!(start >= 0 && start <= end && start < total)) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    return new Response(new Uint8Array(m.data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(m.data), { headers: { ...headers, "Content-Length": String(total) } });
}
