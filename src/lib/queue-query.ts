export const DISPATCH_STATUSES = [
  "submitted",
  "needs_review",
  "needs_customer_information",
  "quote_preparation",
  "quote_sent",
  "quote_accepted",
  "ready_for_matching",
  "offer_sent",
  "assigned",
  "crew_confirmed",
  "ready",
  "en_route",
  "arrived",
  "in_progress",
  "completion_review",
  "incident_hold",
  "reassignment_required",
] as const;
export function parseQueueQuery(input: {
  q?: string;
  status?: string;
  page?: string;
}) {
  const q = String(input.q || "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
  const status = DISPATCH_STATUSES.includes(
    input.status as (typeof DISPATCH_STATUSES)[number],
  )
    ? input.status!
    : "";
  const rawPage = Number(input.page || 1);
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
  return { q: /^[A-Z0-9-]*$/.test(q) ? q : "", status, page, pageSize: 20 };
}
