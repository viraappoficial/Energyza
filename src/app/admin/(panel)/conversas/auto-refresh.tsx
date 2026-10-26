"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Atualiza a tela sozinha enquanto ela está aberta (mensagens novas aparecem sem recarregar)
export function AutoRefresh({ every = 6000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
