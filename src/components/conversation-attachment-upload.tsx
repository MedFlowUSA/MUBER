"use client";
import { useState } from "react";
export function ConversationAttachmentUpload({
  job,
  channel,
  operational,
}: {
  job: string;
  channel: string;
  operational: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
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
    form.set("job", job);
    try {
      const response = await fetch("/api/conversation-attachments", {
          method: "POST",
          body: form,
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setMessage("Attachment sent privately. Refresh to see it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form action={upload} className="mt-4 grid gap-3 rounded-xl border p-4">
      {operational ? (
        <select
          name="channel"
          defaultValue={channel}
          className="rounded-xl border p-3"
        >
          <option value="customer_dispatch">Customer and MUBER</option>
          <option value="provider_dispatch">Contractor and MUBER</option>
          <option value="shared">Shared operational update</option>
          <option value="internal">MUBER internal only</option>
        </select>
      ) : (
        <input type="hidden" name="channel" value={channel} />
      )}
      <input
        name="caption"
        required
        maxLength={5000}
        placeholder="Describe this attachment"
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
        {busy ? "Uploading…" : "Send private attachment"}
      </button>
      {message && (
        <p role="status" className="text-sm font-bold">
          {message}
        </p>
      )}
    </form>
  );
}
