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
  const { data, error } = await supabase.rpc("register_incident_evidence", {
    p_incident: id,
    p_path: String(body.path || ""),
    p_type: String(body.type || ""),
    p_description: String(body.description || ""),
    p_mime: String(body.mime || ""),
    p_size: Number(body.size || 0),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data }, { status: 201 });
}
