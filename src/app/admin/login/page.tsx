"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Lock } from "lucide-react";
import { signIn } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {} as { error?: string; email?: string });
  return (
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div className="bg-circuit pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(224,160,48,0.16),transparent_60%)]" />
      <div className="w-full max-w-sm">
        <Image src="/logo-mark.png" alt="Energyza" width={420} height={380} priority className="mx-auto h-24 w-auto drop-shadow-[0_0_30px_rgba(224,160,48,0.4)]" />
        <p className="font-display mt-4 text-center text-sm font-semibold uppercase tracking-[0.25em] text-gold">Área restrita</p>
        <h1 className="font-display text-center text-4xl font-extrabold uppercase leading-none">Painel <span className="gold-text">Energyza</span></h1>
        <form action={action} className="edge-card mt-8 space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required defaultValue={state.email} className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
          </div>
          {state.error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
          <button className="btn btn-gold w-full !py-3.5 text-lg" disabled={pending}>
            <Lock className="h-5 w-5" /> {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
