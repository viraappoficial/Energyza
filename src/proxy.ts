import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth-edge";

// Protege /admin: sem sessão válida, vai para /admin/login.
export async function proxy(request: NextRequest) {
  const logged = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = request.nextUrl.pathname === "/admin/login";

  if (!logged && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (logged && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
