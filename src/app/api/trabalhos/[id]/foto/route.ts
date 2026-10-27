import { z } from "zod";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Foto de um trabalho enviada pelo painel. Pública (aparece no site); o endereço leva a versão (?v=),
// então pode ficar guardada por muito tempo no navegador e na CDN.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("not found", { status: 404 });
  const [w] = await sql<{ image_data: Buffer | null; image_mime: string }[]>`
    select image_data, image_mime from works where id = ${id} and image_data is not null`;
  if (!w?.image_data) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(w.image_data), {
    headers: {
      "Content-Type": w.image_mime === "image/jpeg" ? "image/jpeg" : "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
