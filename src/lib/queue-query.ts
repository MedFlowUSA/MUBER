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

export const PROVIDER_STATUSES = [
  "approved",
  "suspended",
  "pending",
  "reviewing",
] as const;
export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "information_requested",
  "approved",
  "rejected",
  "withdrawn",
  "suspended",
] as const;
export const INCIDENT_STATUSES = [
  "reported",
  "triage",
  "awaiting_customer_information",
  "awaiting_provider_information",
  "awaiting_crew_information",
  "under_investigation",
  "resolution_proposed",
  "resolved",
  "closed",
  "reopened",
  "void",
] as const;
export const INCIDENT_CATEGORIES = [
  "customer_injury",
  "crew_injury",
  "third_party_injury",
  "property_damage",
  "item_damage",
  "missing_item",
  "unsafe_location",
  "threatening_behavior",
  "vehicle_incident",
  "access_problem",
  "prohibited_hazardous_material",
  "illegal_disposal_concern",
  "provider_conduct",
  "customer_conduct",
  "service_abandonment",
  "other",
] as const;
const boundedPage = (value?: string) => {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1;
};
const safeName = (value?: string) => {
  const q = String(value || "")
    .trim()
    .slice(0, 80);
  return /^[\p{L}\p{N} .&'-]*$/u.test(q) ? q : "";
};
export function parseProviderQueueQuery(input: {
  provider_q?: string;
  provider_status?: string;
  provider_page?: string;
  application_q?: string;
  application_status?: string;
  application_page?: string;
}) {
  return {
    providerQ: safeName(input.provider_q),
    providerStatus: PROVIDER_STATUSES.includes(
      input.provider_status as (typeof PROVIDER_STATUSES)[number],
    )
      ? input.provider_status!
      : "",
    providerPage: boundedPage(input.provider_page),
    applicationQ: safeName(input.application_q),
    applicationStatus: APPLICATION_STATUSES.includes(
      input.application_status as (typeof APPLICATION_STATUSES)[number],
    )
      ? input.application_status!
      : "",
    applicationPage: boundedPage(input.application_page),
    pageSize: 15,
  };
}
export function parseIncidentQueueQuery(input: {
  incident?: string;
  status?: string;
  category?: string;
  page?: string;
}) {
  const incident = String(input.incident || "").trim();
  return {
    incident: /^[0-9a-f-]{36}$/i.test(incident) ? incident : "",
    status: INCIDENT_STATUSES.includes(
      input.status as (typeof INCIDENT_STATUSES)[number],
    )
      ? input.status!
      : "",
    category: INCIDENT_CATEGORIES.includes(
      input.category as (typeof INCIDENT_CATEGORIES)[number],
    )
      ? input.category!
      : "",
    page: boundedPage(input.page),
    pageSize: 20,
  };
}

export const CREDENTIAL_STATUSES = [
  "missing",
  "submitted",
  "under_review",
  "verified",
  "rejected",
  "expiring",
  "expired",
  "suspended",
] as const;
export const COMPLETION_STATUSES = [
  "pending_review",
  "under_review",
  "more_information_requested",
  "returned_to_provider",
  "incident_review_required",
  "approved",
  "voided",
] as const;
const safeCode = (value?: string, max = 60) => {
  const q = String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, max);
  return /^[a-z0-9._-]*$/.test(q) ? q : "";
};
export function parseComplianceQueueQuery(
  input: { status?: string; type?: string; page?: string },
  kind: "credential" | "completion",
) {
  const statuses =
    kind === "credential" ? CREDENTIAL_STATUSES : COMPLETION_STATUSES;
  return {
    status: statuses.includes(input.status as never) ? input.status! : "",
    type: safeCode(input.type),
    page: boundedPage(input.page),
    pageSize: 20,
  };
}
export function parseAuditQueueQuery(input: {
  action?: string;
  entity?: string;
  page?: string;
}) {
  return {
    action: safeCode(input.action),
    entity: safeCode(input.entity),
    page: boundedPage(input.page),
    pageSize: 25,
  };
}
export const OFFER_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
  "superseded",
] as const;
export const ASSIGNMENT_STATUSES = [
  "offered",
  "pending_provider_acceptance",
  "accepted",
  "crew_assigned",
  "crew_confirmed",
  "ready",
  "en_route",
  "arrived",
  "in_progress",
  "completion_review",
  "completed",
  "reassignment_required",
  "canceled",
] as const;
export function parseProviderWorkQuery(
  input: { status?: string; page?: string },
  kind: "offer" | "assignment",
) {
  const statuses = kind === "offer" ? OFFER_STATUSES : ASSIGNMENT_STATUSES;
  return {
    status: statuses.includes(input.status as never) ? input.status! : "",
    page: boundedPage(input.page),
    pageSize: 20,
  };
}
export function parseNotificationQuery(input: {
  view?: string;
  page?: string;
}) {
  return {
    view: input.view === "unread" ? "unread" : "all",
    page: boundedPage(input.page),
    pageSize: 25,
  };
}
export function parseConversationQuery(input: {
  view?: string;
  page?: string;
  message_page?: string;
}) {
  return {
    view: ["unread", "needs_reply"].includes(input.view || "")
      ? input.view!
      : "all",
    page: boundedPage(input.page),
    pageSize: 20,
    messagePage: boundedPage(input.message_page),
    messagePageSize: 50,
  };
}
