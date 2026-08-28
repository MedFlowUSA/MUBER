import { NextRequest, NextResponse } from "next/server";
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
  const body = await request.json();
  const { data, error } = await supabase.rpc(
    "register_completion_draft_media",
    {
      p_draft: id,
      p_path: String(body.path || ""),
      p_purpose: String(body.purpose || ""),
      p_mime: String(body.mime || ""),
      p_size: Number(body.size || 0),
    },
  );
  if (error)
    return NextResponse.json(
      { error: "Evidence could not be registered" },
      { status: 400 },
    );
  return NextResponse.json({ id: data }, { status: 201 });
}
