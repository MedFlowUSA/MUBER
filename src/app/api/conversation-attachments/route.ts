import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const detect = (b: Uint8Array) =>
  b[0] === 255 && b[1] === 216 && b[2] === 255
    ? "image/jpeg"
    : [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)
      ? "image/png"
      : String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...b.slice(8, 12)) === "WEBP"
        ? "image/webp"
        : String.fromCharCode(...b.slice(0, 5)) === "%PDF-"
          ? "application/pdf"
          : null;
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const form = await request.formData(),
    file = form.get("file"),
    job = String(form.get("job") || ""),
    channel = String(form.get("channel") || ""),
    caption = String(form.get("caption") || "").trim();
  if (
    !(file instanceof File) ||
    !/^[0-9a-f-]{36}$/i.test(job) ||
    !caption ||
    caption.length > 5000 ||
    file.size < 1 ||
    file.size > 10485760
  )
    return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = detect(bytes);
  if (!mime || mime !== file.type)
    return NextResponse.json(
      { error: "File content does not match an allowed type" },
      { status: 400 },
    );
  const ext: { [key: string]: string } = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    },
    path = `${user.id}/${job}/${crypto.randomUUID()}.${ext[mime]}`,
    stored = await supabase.storage
      .from("conversation-attachments")
      .upload(path, bytes, { contentType: mime, upsert: false });
  if (stored.error)
    return NextResponse.json(
      { error: "Private upload was rejected" },
      { status: 400 },
    );
  const { data, error } = await supabase.rpc("post_job_message_attachment", {
    p_job: job,
    p_channel: channel,
    p_body: caption,
    p_path: path,
    p_mime: mime,
    p_size: file.size,
    p_request_id: crypto.randomUUID(),
  });
  if (error) {
    await supabase.storage.from("conversation-attachments").remove([path]);
    return NextResponse.json(
      { error: "Private attachment could not be registered" },
      { status: 400 },
    );
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
