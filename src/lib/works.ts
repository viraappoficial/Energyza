import "server-only";
import sharp from "sharp";
import { sql } from "@/lib/db";

export type WorkRow = { id: string; title: string; description: string; src: string; active: boolean; sort_order: number };

export const MAX_WORKS = 40;
export const MAX_UPLOAD = 4_000_000;

// endereço público da foto (a versão muda quando a foto é trocada, para não ficar no cache)
export const workSrc = (w: { id: string; static_src: string | null; updated_at: string | Date }) =>
  w.static_src ?? `/api/trabalhos/${w.id}/foto?v=${new Date(w.updated_at).getTime()}`;

export async function listWorks(onlyActive: boolean): Promise<WorkRow[]> {
  const rows = await sql<{ id: string; title: string; description: string; static_src: string | null; updated_at: string; active: boolean; sort_order: number }[]>`
    select id, title, description, static_src, updated_at, active, sort_order from works
    ${onlyActive ? sql`where active` : sql``}
    order by sort_order, created_at`;
  return rows.map((r) => ({ id: r.id, title: r.title, description: r.description, src: workSrc(r), active: r.active, sort_order: r.sort_order }));
}

// Foto enviada: corrige a rotação, reduz, tira os metadados (inclui localização GPS) e guarda como JPEG.
export async function normalizePhoto(input: Buffer) {
  const img = sharp(input, { limitInputPixels: 80_000_000, failOn: "error" });
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("imagem inválida");
  const data = await img
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return { data, mime: "image/jpeg" };
}
