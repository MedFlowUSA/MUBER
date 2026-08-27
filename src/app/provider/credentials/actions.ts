"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function hasExpectedSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "application/pdf")
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (file.type === "image/png")
    return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (file.type === "image/webp")
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}

export async function submitCredential(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/credentials",
  );
  const file = form.get("document");
  if (
    !(file instanceof File) ||
    file.size < 1 ||
    file.size > 10_485_760 ||
    !allowedTypes.has(file.type) ||
    !(await hasExpectedSignature(file))
  ) {
    redirect(
      "/provider/credentials?error=Upload%20a%20PDF%2C%20JPEG%2C%20PNG%2C%20or%20WebP%20under%2010MB",
    );
  }
  const result = await supabase.rpc("create_provider_credential", {
    p_type: String(form.get("credential_type") || ""),
    p_number: String(form.get("credential_number") || ""),
    p_issuer: String(form.get("issuing_authority") || ""),
    p_issued: String(form.get("issued_at") || "") || null,
    p_expires: String(form.get("expires_at") || "") || null,
  });
  if (result.error || !result.data)
    redirect(
      `/provider/credentials?error=${encodeURIComponent(result.error?.message || "Credential could not be created")}`,
    );
  const { data: credential } = await supabase
    .from("provider_credentials")
    .select("provider_company_id")
    .eq("id", result.data)
    .single();
  if (!credential)
    redirect(
      "/provider/credentials?error=Provider%20membership%20could%20not%20be%20resolved",
    );
  const extension =
    file.name
      .split(".")
      .pop()
      ?.replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || "bin";
  const path = `${credential.provider_company_id}/${result.data}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage
    .from("provider-credentials")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error)
    redirect(
      `/provider/credentials?error=${encodeURIComponent(upload.error.message)}`,
    );
  const registered = await supabase.rpc("register_credential_document", {
    p_credential: result.data,
    p_path: path,
  });
  if (registered.error)
    redirect(
      `/provider/credentials?error=${encodeURIComponent(registered.error.message)}`,
    );
  revalidatePath("/provider/credentials");
  redirect("/provider/credentials?submitted=1");
}
