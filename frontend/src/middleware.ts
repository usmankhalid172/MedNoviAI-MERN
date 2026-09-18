import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value || "";
  const { pathname } = request.nextUrl;

  // Protected Patient Routes
  if (pathname.startsWith("/patient") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already Logged-in User
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/patient/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/patient/:path*", "/login"],
};