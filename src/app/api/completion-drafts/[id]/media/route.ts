import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completionDraftMediaSchema } from "@/lib/private-media-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const parsed = completionDraftMediaSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid evidence metadata" },
      { status: 400 },
    );
  const body = parsed.data;
  const { data, error } = await supabase.rpc(
    "register_completion_draft_media",
    {
      p_draft: id,
      p_path: body.path,
      p_purpose: body.purpose,
      p_mime: body.mime,
      p_size: body.size,
    },
  );
  if (error)
    return NextResponse.json(
      { error: "Evidence could not be registered" },
      { status: 400 },
    );
  return NextResponse.json({ id: data }, { status: 201 });
}
