import "server-only";
import sharp from "sharp";

// Limites por tipo (o banco é pequeno: o que passa do limite não é guardado e a conversa avisa "veja no celular")
const LIMIT = { image: 6_000_000, audio: 3_000_000, video: 4_000_000, other: 6_000_000 } as const;

export type Prepared = { data: Buffer; mime: string } | { skipped: "grande" | "invalido"; size: number };

// Prepara o arquivo para guardar: fotos viram WebP leve (máx. 1600 px, sem GPS), o resto só passa se couber no limite.
export async function prepareMedia(buf: Buffer, mime: string, format: "webp" | "jpeg" = "webp"): Promise<Prepared> {
  const m = (mime || "application/octet-stream").toLowerCase();
  if (m.startsWith("image/") && m !== "image/gif") {
    try {
      const img = sharp(buf, { limitInputPixels: 80_000_000, animated: true });
      const meta = await img.metadata();
      // figurinha/imagem animada: re-comprimir perderia a animação; guarda como veio se for pequena
      if ((meta.pages ?? 1) > 1) return buf.length <= 1_500_000 ? { data: buf, mime: m } : { skipped: "grande", size: buf.length };
      const pipeline = sharp(buf, { limitInputPixels: 80_000_000 })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
      // JPEG para o que enviamos (o WhatsApp trata imagem WebP como figurinha); WebP, mais leve, para o que guardamos
      return format === "jpeg"
        ? { data: await pipeline.jpeg({ quality: 78, mozjpeg: true }).toBuffer(), mime: "image/jpeg" }
        : { data: await pipeline.webp({ quality: 76 }).toBuffer(), mime: "image/webp" };
    } catch {
      return { skipped: "invalido", size: buf.length };
    }
  }
  const kind = m.startsWith("image/") ? "image" : m.startsWith("audio/") ? "audio" : m.startsWith("video/") ? "video" : "other";
  const limit = m === "image/gif" ? 1_500_000 : LIMIT[kind];
  return buf.length <= limit ? { data: buf, mime: m } : { skipped: "grande", size: buf.length };
}

export const mb = (n: number) => `${(n / 1_000_000).toFixed(1).replace(".", ",")} MB`;
