import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    supabase = await createSupabaseServerClient(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const { data: item } = await supabase
    .from("job_message_attachments")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data, error } = await supabase.storage
    .from("conversation-attachments")
    .createSignedUrl(item.storage_path, 300);
  if (error || !data.signedUrl)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl, 302);
}
