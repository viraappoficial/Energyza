import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth-edge";

// Subdomínio do painel (ex.: painel.energyzaeletrica.com.br). Sem PANEL_HOST nada muda.
const PANEL_HOST = process.env.PANEL_HOST?.trim().toLowerCase() || "";
// Endereços do site público que devem mandar /admin para o subdomínio do painel.
// O endereço da Vercel (*.vercel.app) fica de fora de propósito: continua abrindo o painel (plano B).
const SITE_HOSTS = (process.env.SITE_HOSTS ?? "energyzaeletrica.com.br,www.energyzaeletrica.com.br")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .toLowerCase()
    .split(":")[0];
  const onPanelHost = !!PANEL_HOST && host === PANEL_HOST;

  if (PANEL_HOST) {
    // site público: /admin só existe no subdomínio do painel
    if (!onPanelHost && SITE_HOSTS.includes(host) && pathname.startsWith("/admin")) {
      return NextResponse.redirect(`https://${PANEL_HOST}${pathname}${search}`, 308);
    }
    // painel: só as áreas do painel (o PDF do orçamento e a API continuam abertos)
    if (onPanelHost) {
      const allowed = pathname.startsWith("/admin") || pathname.startsWith("/orcamento/") || pathname.startsWith("/api/");
      if (!allowed) return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    const logged = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
    const isLogin = pathname === "/admin/login";
    if (!logged && !isLogin) return NextResponse.redirect(new URL("/admin/login", request.url));
    if (logged && isLogin) return NextResponse.redirect(new URL("/admin", request.url));
  }

  const res = NextResponse.next();
  if (onPanelHost) res.headers.set("X-Robots-Tag", "noindex, nofollow"); // painel não aparece no Google
  return res;
}

export const config = {
  // tudo, menos arquivos estáticos (qualquer caminho com ponto: .png, .ico, .woff2…) e internos do Next
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
