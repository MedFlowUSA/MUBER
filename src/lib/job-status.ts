export const customerStatus: Record<string, { label: string; next: string }> = {
  submitted: { label: "Submitted", next: "MUBER will review your request." },
  needs_review: {
    label: "Under review",
    next: "MUBER is reviewing your scope and photos.",
  },
  needs_customer_information: {
    label: "Information needed",
    next: "Please watch for a request from MUBER.",
  },
  quote_preparation: {
    label: "Quote in progress",
    next: "MUBER is preparing your quote.",
  },
  quote_sent: {
    label: "Quote ready",
    next: "Review your quote before it expires.",
  },
  quote_accepted: {
    label: "Quote accepted",
    next: "Provider matching will begin next.",
  },
  ready_for_matching: {
    label: "Matching in progress",
    next: "MUBER is selecting an eligible provider.",
  },
  offer_sent: {
    label: "Matching in progress",
    next: "A provider offer is awaiting action.",
  },
  assigned: {
    label: "Provider assigned",
    next: "Crew and appointment details are being confirmed.",
  },
  crew_confirmed: {
    label: "Crew confirmed",
    next: "Your assigned crew is confirmed.",
  },
  ready: { label: "Ready", next: "Your appointment is ready." },
  en_route: {
    label: "Crew en route",
    next: "Your crew is traveling to the appointment. Live tracking is not available.",
  },
  arrived: { label: "Crew arrived", next: "Your crew has reported arrival." },
  in_progress: {
    label: "Work in progress",
    next: "Your assigned crew is completing the work.",
  },
  completion_review: {
    label: "Completion review",
    next: "MUBER is reviewing the submitted completion details.",
  },
  cancelled: {
    label: "Canceled",
    next: "Contact support if you have questions.",
  },
  incident_hold: {
    label: "Under review",
    next: "MUBER is reviewing an issue with this request.",
  },
};
export const statusForCustomer = (status: string) =>
  customerStatus[status] || {
    label: status.replaceAll("_", " "),
    next: "MUBER will provide the next update here.",
  };
export const crewFieldActions: Record<
  string,
  { command: string; label: string }
> = {
  crew_confirmed: { command: "mark_ready", label: "Mark crew ready" },
  ready: { command: "start_en_route", label: "Start en route" },
  en_route: { command: "mark_arrived", label: "Report arrival" },
  arrived: { command: "start_work", label: "Start work" },
};
export const dispatchCommands: Record<
  string,
  { label: string; command: string; reason?: boolean }[]
> = {
  submitted: [
    { label: "Start review", command: "start_review" },
    {
      label: "Request information",
      command: "request_customer_information",
      reason: true,
    },
  ],
  needs_review: [
    {
      label: "Request information",
      command: "request_customer_information",
      reason: true,
    },
    { label: "Begin quote", command: "begin_quote" },
    { label: "Place on incident hold", command: "incident_hold", reason: true },
  ],
  needs_customer_information: [
    { label: "Resume review", command: "resume_review" },
    { label: "Cancel request", command: "cancel", reason: true },
  ],
  quote_preparation: [
    { label: "Place on incident hold", command: "incident_hold", reason: true },
  ],
  quote_accepted: [
    { label: "Ready for matching", command: "ready_for_matching" },
  ],
  ready_for_matching: [
    { label: "Mark offer sent", command: "mark_offer_sent" },
  ],
  offer_sent: [
    { label: "Mark assigned", command: "mark_assigned" },
    {
      label: "Require reassignment",
      command: "require_reassignment",
      reason: true,
    },
  ],
  assigned: [
    {
      label: "Require reassignment",
      command: "require_reassignment",
      reason: true,
    },
  ],
  crew_confirmed: [
    {
      label: "Require reassignment",
      command: "require_reassignment",
      reason: true,
    },
  ],
  reassignment_required: [{ label: "Mark assigned", command: "mark_assigned" }],
};
