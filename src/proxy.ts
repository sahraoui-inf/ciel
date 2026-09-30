import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { locales, defaultLocale, rtlLocales } from "./app/i18n";

function getJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) return new TextEncoder().encode("dev-secret-change-in-production");
  return new TextEncoder().encode(s);
}

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale;

  const acceptLang = request.headers.get("accept-language") || "";
  const preferred = acceptLang.split(",").map(l => l.split(";")[0].trim());
  for (const lang of preferred) {
    const short = lang.substring(0, 2);
    if (locales.includes(short)) return short;
  }
  return defaultLocale;
}

const publicPaths = [
  "/login", "/register", "/forgot-password",
  "/about", "/events", "/gallery", "/faq", "/contact",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApi = pathname.startsWith("/api");
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/images") || pathname.startsWith("/uploads") || pathname === "/favicon.ico";

  if (isStatic || isApi) return NextResponse.next();

  const segments = pathname.split("/").filter(Boolean);
  const locale = locales.includes(segments[0] || "") ? segments[0] : null;
  const pathWithoutLocale = locale ? "/" + segments.slice(1).join("/") : pathname;

  const isRoot = pathWithoutLocale === "/";
  const isPublic = isRoot || publicPaths.some(p => pathWithoutLocale.startsWith(p));

  if (!locale) {
    const detected = getLocale(request);
    const url = new URL(`/${detected}${pathname}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get("session")?.value;
  let user = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      user = payload;
    } catch { }
  }

  if (!isPublic && !user) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (user) {
    const dir = rtlLocales.includes(user.locale as string) ? "rtl" : "ltr";
    response.cookies.set("dir", dir, { path: "/" });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|uploads).*)"],
};
