"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {} as { error?: string; email?: string });
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-bold">
          Área <span className="text-gold">restrita</span>
        </h1>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required defaultValue={state.email} className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
        </div>
        {state.error && <p className="text-sm text-red-300">{state.error}</p>}
        <button className="btn btn-gold w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
