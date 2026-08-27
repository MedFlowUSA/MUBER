import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data } = await supabase
    .from("provider_credentials")
    .select("private_storage_path")
    .eq("id", id)
    .single();
  if (!data?.private_storage_path)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const signed = await supabase.storage
    .from("provider-credentials")
    .createSignedUrl(data.private_storage_path, 60);
  if (signed.error || !signed.data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl);
}
