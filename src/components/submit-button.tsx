"use client";

import { useFormStatus } from "react-dom";

// Botão de envio com resposta visual: enquanto o servidor trabalha, mostra um indicador e não deixa tocar de novo.
export function SubmitButton({
  children,
  pendingText = "Salvando…",
  className = "btn btn-gold",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <>
          <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
