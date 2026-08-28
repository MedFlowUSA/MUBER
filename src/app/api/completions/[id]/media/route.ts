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
  let body: {
    path?: string;
    purpose?: string;
    customerVisible?: boolean;
    mime?: string;
    size?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { data, error } = await supabase.rpc("register_completion_media", {
    p_submission: id,
    p_path: body.path || "",
    p_purpose: body.purpose || "",
    p_customer_visible: Boolean(body.customerVisible),
    p_mime: body.mime || "",
    p_size: Number(body.size || 0),
  });
  if (error)
    return NextResponse.json(
      { error: "Evidence could not be registered" },
      { status: 400 },
    );
  return NextResponse.json({ id: data }, { status: 201 });
}
