"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
export function CompletionEvidenceUpload({
  submission,
  job,
  draft = false,
}: {
  submission: string;
  job: string;
  draft?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function upload(form: FormData) {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return;
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type) || file.size > 10485760) {
      setMessage("Use JPG, PNG, WebP, or PDF under 10 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired");
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${job}/${crypto.randomUUID()}.${ext}`;
      const stored = await supabase.storage
        .from("completion-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (stored.error) throw new Error("Evidence upload failed");
      const endpoint = draft
        ? `/api/completion-drafts/${submission}/media`
        : `/api/completions/${submission}/media`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          path,
          purpose: String(form.get("purpose")),
          customerVisible: form.get("customer_visible") === "on",
          mime: file.type,
          size: file.size,
        }),
      });
      if (!response.ok) throw new Error("Evidence could not be registered");
      setMessage("Evidence uploaded privately.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      action={upload}
      className="mt-5 grid gap-3 rounded-2xl border bg-white p-5"
    >
      <label className="font-bold">
        Evidence type
        <select
          name="purpose"
          className="mt-1 block w-full rounded-xl border p-3 font-normal"
        >
          <option value="before">Before photo</option>
          <option value="after">After photo</option>
          <option value="disposal_receipt">Disposal receipt</option>
          <option value="donation_receipt">Donation receipt</option>
          <option value="incident">Incident evidence (internal)</option>
          <option value="other">Other evidence</option>
        </select>
      </label>
      <label className="font-bold">
        Private evidence file
        <input
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="mt-1 block w-full rounded-xl border p-3 font-normal"
        />
      </label>
      <label className="text-sm">
        <input type="checkbox" name="customer_visible" /> Allow customer to view
        after review
      </label>
      <button
        disabled={busy}
        className="rounded-xl bg-navy px-5 py-3 font-bold text-white disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload evidence"}
      </button>
      {message && (
        <p role="status" className="text-sm font-bold">
          {message}
        </p>
      )}
    </form>
  );
}
