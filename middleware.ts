import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
export async function middleware(request: NextRequest) {
  return updateSession(request);
}
export const config = {
  matcher: [
    "/auth/:path*",
    "/portal/:path*",
    "/customer/:path*",
    "/provider/dashboard/:path*",
    "/provider/offers/:path*",
    "/provider/jobs/:path*",
    "/provider/fleet/:path*",
    "/provider/credentials/:path*",
    "/crew/:path*",
    "/dispatch/:path*",
    "/admin/:path*",
    "/notifications/:path*",
  ],
};
