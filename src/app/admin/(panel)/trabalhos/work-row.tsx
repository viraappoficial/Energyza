"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";
import { deleteWork, moveWork, toggleWork } from "../../actions";
import { WorkForm } from "./work-form";

type Work = { id: string; title: string; description: string; src: string; active: boolean };

const iconBtn = "grid h-11 w-11 place-items-center rounded-lg border border-border text-neutral-300 hover:border-gold hover:text-gold disabled:opacity-30";

export function WorkRow({ w, first, last }: { w: Work; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className={`edge-card p-3 ${w.active ? "" : "opacity-60"}`}>
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={w.src} alt="" className="h-20 w-28 shrink-0 rounded-md object-cover sm:h-24 sm:w-36" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{w.title}</p>
          <p className="line-clamp-2 text-sm text-muted">{w.description || "Sem descrição"}</p>
          {!w.active && <span className="mt-1 inline-block rounded-full border border-neutral-500/50 px-2 py-0.5 text-xs text-neutral-300">Oculto no site</span>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={moveWork}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="dir" value="up" /><button disabled={first} aria-label="Subir" className={iconBtn}><ArrowUp className="h-5 w-5" /></button></form>
        <form action={moveWork}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="dir" value="down" /><button disabled={last} aria-label="Descer" className={iconBtn}><ArrowDown className="h-5 w-5" /></button></form>
        <form action={toggleWork}><input type="hidden" name="id" value={w.id} /><button aria-label={w.active ? "Ocultar do site" : "Mostrar no site"} title={w.active ? "Ocultar do site" : "Mostrar no site"} className={iconBtn}>{w.active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></form>
        <button type="button" onClick={() => setEditing((v) => !v)} aria-label={editing ? "Fechar edição" : "Editar"} className={iconBtn}>{editing ? <X className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}</button>
        <form
          action={deleteWork}
          onSubmit={(e) => { if (!confirm(`Apagar “${w.title}”? Isso não pode ser desfeito.`)) e.preventDefault(); }}
          className="ml-auto"
        >
          <input type="hidden" name="id" value={w.id} />
          <button aria-label="Apagar" className={`${iconBtn} !border-red-500/40 !text-red-300 hover:!border-red-400`}><Trash2 className="h-5 w-5" /></button>
        </form>
      </div>

      {editing && (
        <div className="mt-4 border-t border-border pt-4">
          <WorkForm work={w} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
