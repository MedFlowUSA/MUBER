export type ProviderReadinessInput = {
  companyStatus?: string | null;
  available?: boolean | null;
  credentials: Array<{
    verification_status: string;
    expires_at: string | null;
  }>;
  vehicles: Array<{ active: boolean; insurance_eligible: boolean }>;
  crews: Array<{ active: boolean }>;
  serviceDate: string;
};

export type ReadinessItem = {
  key: "company" | "availability" | "credentials" | "vehicles" | "crews";
  label: string;
  detail: string;
  ready: boolean;
  href: string;
};

const daysUntil = (date: string, serviceDate: string) =>
  Math.ceil(
    (new Date(`${date}T00:00:00Z`).getTime() -
      new Date(`${serviceDate}T00:00:00Z`).getTime()) /
      86_400_000,
  );

export function getProviderReadiness(input: ProviderReadinessInput) {
  const currentCredentials = input.credentials.filter(
    (credential) =>
      credential.verification_status === "verified" &&
      (!credential.expires_at ||
        daysUntil(credential.expires_at, input.serviceDate) > 0),
  );
  const expiringCredentials = currentCredentials
    .filter(
      (credential) =>
        credential.expires_at &&
        daysUntil(credential.expires_at, input.serviceDate) <= 30,
    )
    .map((credential) => ({
      expiresAt: credential.expires_at as string,
      daysRemaining: daysUntil(
        credential.expires_at as string,
        input.serviceDate,
      ),
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
  const eligibleVehicles = input.vehicles.filter(
    (vehicle) => vehicle.active && vehicle.insurance_eligible,
  ).length;
  const activeCrews = input.crews.filter((crew) => crew.active).length;

  const items: ReadinessItem[] = [
    {
      key: "company",
      label: "Company approved",
      detail:
        input.companyStatus === "suspended"
          ? "Company access is suspended. Contact MUBER support."
          : input.companyStatus === "approved"
            ? "Company approval is active."
            : "Company approval is required before dispatch.",
      ready: input.companyStatus === "approved",
      href: "/provider/profile",
    },
    {
      key: "availability",
      label: "Accepting offers",
      detail: input.available
        ? "Your company is available for new offers."
        : "Turn on availability when your company can accept work.",
      ready: Boolean(input.available),
      href: "/provider/profile",
    },
    {
      key: "credentials",
      label: "Current credentials",
      detail: currentCredentials.length
        ? `${currentCredentials.length} verified, unexpired credential${currentCredentials.length === 1 ? "" : "s"}.`
        : "Submit credentials and complete compliance review.",
      ready: currentCredentials.length > 0,
      href: "/provider/credentials",
    },
    {
      key: "vehicles",
      label: "Dispatch-ready vehicle",
      detail: eligibleVehicles
        ? `${eligibleVehicles} active, insurance-eligible vehicle${eligibleVehicles === 1 ? "" : "s"}.`
        : "Add an active vehicle and confirm insurance eligibility.",
      ready: eligibleVehicles > 0,
      href: "/provider/fleet",
    },
    {
      key: "crews",
      label: "Active crew",
      detail: activeCrews
        ? `${activeCrews} active crew${activeCrews === 1 ? "" : "s"} available for assignment.`
        : "Create and activate at least one crew.",
      ready: activeCrews > 0,
      href: "/provider/fleet",
    },
  ];

  return {
    ready: items.every((item) => item.ready),
    readyCount: items.filter((item) => item.ready).length,
    items,
    expiringCredentials,
  };
}
