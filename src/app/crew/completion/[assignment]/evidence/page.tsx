import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { CompletionEvidenceUpload } from "@/components/completion-evidence-upload";
import { requireOperationalRole } from "@/lib/authorization";
export default async function EvidencePage({
  params,
}: {
  params: Promise<{ assignment: string }>;
}) {
  const { assignment } = await params;
  const { supabase } = await requireOperationalRole(
    ["crew_lead", "crew_member"],
    `/crew/completion/${assignment}/evidence`,
  );
  const { data: submission } = await supabase
    .from("completion_submissions")
    .select(
      "id,job_id,version,status,completion_media(id,purpose,customer_visible,mime_type,created_at)",
    )
    .eq("assignment_id", assignment)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!submission) notFound();
  return (
    <RoleShell role="crew">
      <Link href="/crew" className="text-sm font-bold text-orange-600">
        ← Crew work
      </Link>
      <p className="eyebrow mt-6">Private evidence</p>
      <h1 className="mt-2 text-4xl font-black">Completion evidence</h1>
      <p className="mt-3 text-slate">
        Files remain private. Customer visibility is explicit and incident
        evidence cannot be customer-visible by default.
      </p>
      <CompletionEvidenceUpload
        submission={submission.id}
        job={submission.job_id}
      />
      <div className="mt-6 grid gap-3">
        {(submission.completion_media || []).map((m) => (
          <p key={m.id} className="rounded-xl border bg-white p-4 font-bold">
            {m.purpose.replaceAll("_", " ")} · {m.mime_type} ·{" "}
            {m.customer_visible ? "customer-visible after review" : "internal"}
          </p>
        ))}
      </div>
    </RoleShell>
  );
}
