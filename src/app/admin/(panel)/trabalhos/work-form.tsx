"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { saveWork, type WorkState } from "../../actions";
import { shrinkImage } from "@/lib/resize-image";

type Props = { work?: { id: string; title: string; description: string; src: string }; onDone?: () => void };

// Adicionar ou editar um trabalho (foto, título e descrição)
export function WorkForm({ work, onDone }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState("");

  const [state, action, pending] = useActionState(async (prev: WorkState, fd: FormData) => {
    // a foto é reduzida aqui no celular antes de subir
    const f = fd.get("image");
    if (f instanceof File && f.size > 0) fd.set("image", await shrinkImage(f));
    const r = await saveWork(prev, fd);
    if (r.ok) {
      formRef.current?.reset();
      setPreview("");
      onDone?.();
    }
    return r;
  }, {} as WorkState);

  const shown = preview || work?.src || "";

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {work && <input type="hidden" name="id" value={work.id} />}
      <label className="relative grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-[#0d0d0d] text-center text-muted hover:border-gold">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Foto do trabalho" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4"><ImagePlus className="h-8 w-8 text-gold" /> Toque para escolher a foto</span>
        )}
        {shown && <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">Trocar foto</span>}
        <input
          name="image"
          type="file"
          accept="image/*"
          required={!work}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : ""; });
          }}
        />
      </label>
      <input name="title" required minLength={3} maxLength={80} placeholder="Título (ex.: Quadro de luz novo)" defaultValue={work?.title} className="input" />
      <textarea name="description" rows={2} maxLength={160} placeholder="Descrição (ex.: Residência · Maringá/PR)" defaultValue={work?.description} className="input" />
      {state.error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
      {state.ok && !work && <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">Trabalho adicionado. Já aparece no site.</p>}
      <button disabled={pending} className="btn btn-gold w-full !py-3">
        {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Enviando…</> : work ? "Salvar alterações" : "Adicionar ao site"}
      </button>
    </form>
  );
}
