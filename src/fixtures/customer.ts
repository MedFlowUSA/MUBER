export const customerFixture = {
  upcoming: [
    {
      id: "JOB-1042",
      service: "Apartment move",
      date: "Sep 12 · 9–11 AM",
      status: "Provider matching",
      from: "Redlands",
      to: "Loma Linda",
    },
  ],
  quotes: [
    {
      id: "REQ-1048",
      service: "Junk removal",
      submitted: "Today",
      status: "Details under review",
    },
  ],
  timeline: [
    "Request received",
    "Details reviewed",
    "Provider matched",
    "Job in progress",
    "Completed",
  ],
  past: [
    {
      id: "JOB-0988",
      service: "Furniture delivery",
      date: "Jul 18",
      status: "Completed",
    },
  ],
} as const;
