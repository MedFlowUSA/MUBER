import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema = z.object({
  path: z.string().max(1000),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(10485760),
});
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "INVALID_MEDIA" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { error } = await supabase.rpc("register_job_media", {
    p_job: id,
    p_path: parsed.data.path,
    p_mime: parsed.data.mime,
    p_size: parsed.data.size,
  });
  return error
    ? NextResponse.json({ error: "MEDIA_FAILED" }, { status: 400 })
    : NextResponse.json({ ok: true });
}
