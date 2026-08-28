export const providerApplicationStatuses: Record<
  string,
  { label: string; heading: string; description: string; tone: string }
> = {
  draft: {
    label: "Draft",
    heading: "Your application is not submitted yet.",
    description:
      "Contact MUBER support if you need help completing this application.",
    tone: "bg-amber-50 text-amber-950 border-amber-300",
  },
  submitted: {
    label: "Submitted",
    heading: "Your application is in the review queue.",
    description:
      "MUBER will review your company information before any contractor access is granted.",
    tone: "bg-blue-50 text-blue-950 border-blue-200",
  },
  under_review: {
    label: "Under review",
    heading: "Compliance review is underway.",
    description:
      "No action is required unless MUBER requests additional information.",
    tone: "bg-blue-50 text-blue-950 border-blue-200",
  },
  information_requested: {
    label: "Information requested",
    heading: "MUBER needs more information.",
    description:
      "Contact support for the requested items. Internal review notes are never displayed here.",
    tone: "bg-amber-50 text-amber-950 border-amber-300",
  },
  approved: {
    label: "Approved",
    heading: "Your contractor company is approved.",
    description:
      "Continue to the contractor portal to finish operational readiness.",
    tone: "bg-emerald-50 text-emerald-950 border-emerald-200",
  },
  rejected: {
    label: "Not approved",
    heading: "MUBER cannot approve this application at this time.",
    description:
      "Contact support if you have questions. Sensitive internal review notes are not displayed.",
    tone: "bg-red-50 text-red-950 border-red-200",
  },
  withdrawn: {
    label: "Withdrawn",
    heading: "This application was withdrawn.",
    description: "Contact support before beginning another application.",
    tone: "bg-slate-50 text-slate-900 border-slate-200",
  },
  suspended: {
    label: "Suspended",
    heading: "Contractor access is suspended.",
    description:
      "Contact MUBER support for the required compliance or operational next step.",
    tone: "bg-red-50 text-red-950 border-red-200",
  },
};

export function providerApplicationStatus(status: string) {
  return (
    providerApplicationStatuses[status] || {
      label: "In review",
      heading: "Your application status is being updated.",
      description: "Contact MUBER support if you need assistance.",
      tone: "bg-slate-50 text-slate-900 border-slate-200",
    }
  );
}
