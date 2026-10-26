"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Lock } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { signIn } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {} as { error?: string; email?: string });
  return (
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div className="bg-circuit pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] -z-10 h-[30rem] w-[30rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(224,160,48,0.22),transparent_65%)]" style={{ animation: "glow-pulse 5s ease-in-out infinite" }} />
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-40" aria-hidden>
        <path d="M-20 700 L300 700 L340 640 L600 640 L640 580 L1020 580" fill="none" stroke="#e0a030" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeDasharray="6 26" style={{ animation: "arc-dash 9s linear infinite" }} />
        <path d="M1020 820 L700 820 L660 880 L300 880 L260 940 L-20 940" fill="none" stroke="#e0a030" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 30" style={{ animation: "arc-dash 12s linear infinite" }} />
      </svg>
      <Reveal className="w-full max-w-sm">
        <div className="relative mx-auto grid h-28 w-28 place-items-center">
          <svg viewBox="0 0 200 200" className="absolute inset-[-14%] h-[128%] w-[128%]" aria-hidden style={{ animation: "ring-spin 40s linear infinite" }}>
            <circle cx="100" cy="100" r="96" fill="none" stroke="#e0a030" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="2 7" />
            <circle cx="100" cy="100" r="86" fill="none" stroke="#e0a030" strokeOpacity="0.22" strokeWidth="0.8" />
          </svg>
          <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(224,160,48,0.3),transparent_70%)]" style={{ animation: "glow-pulse 4s ease-in-out infinite" }} />
          <Image src="/logo-mark.png" alt="Energyza" width={420} height={380} priority className="relative h-20 w-auto drop-shadow-[0_0_30px_rgba(224,160,48,0.4)]" />
        </div>
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
      </Reveal>
    </main>
  );
}
