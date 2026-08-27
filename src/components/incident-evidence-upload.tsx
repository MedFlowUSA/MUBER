"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function IncidentEvidenceUpload({ incident }: { incident: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(form: FormData) {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      ) ||
      file.size > 10485760
    )
      return setMessage("Use JPG, PNG, WebP, or PDF under 10 MB.");
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired");
      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${incident}/${crypto.randomUUID()}.${extension}`;
      const stored = await supabase.storage
        .from("incident-evidence")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (stored.error) throw new Error("Private upload failed");
      const response = await fetch(`/api/incidents/${incident}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          path,
          type: String(form.get("type")),
          description: String(form.get("description") || ""),
          mime: file.type,
          size: file.size,
        }),
      });
      if (!response.ok) {
        await supabase.storage.from("incident-evidence").remove([path]);
        throw new Error("Evidence could not be registered");
      }
      setMessage("Evidence uploaded privately. Refresh to see it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form action={upload} className="mt-4 grid gap-3 rounded-xl border p-4">
      <select name="type" className="rounded-xl border p-3">
        <option value="photo">Photo</option>
        <option value="document">Document</option>
        <option value="receipt">Receipt</option>
        <option value="correspondence">Correspondence</option>
        <option value="other">Other</option>
      </select>
      <input
        name="description"
        minLength={3}
        maxLength={500}
        placeholder="Short evidence description (optional)"
        className="rounded-xl border p-3"
      />
      <input
        name="file"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="rounded-xl border p-3"
      />
      <button
        disabled={busy}
        className="rounded-xl bg-navy px-4 py-3 font-bold text-white disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload private evidence"}
      </button>
      {message && (
        <p role="status" className="text-sm font-bold">
          {message}
        </p>
      )}
    </form>
  );
}
