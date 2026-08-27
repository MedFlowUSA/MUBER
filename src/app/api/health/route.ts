import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "muber-web" },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
