import {
  BriefcaseBusiness,
  House,
  LayoutDashboard,
  LifeBuoy,
  Truck,
} from "lucide-react";
export const publicNav = [
  { label: "How it works", href: "/#how" },
  { label: "Service area", href: "/#area" },
  { label: "For providers", href: "/provider" },
  { label: "Support", href: "/support" },
] as const;
export const roleRoutes = {
  customer: { label: "Customer", href: "/customer", icon: House },
  provider: { label: "Provider", href: "/provider", icon: BriefcaseBusiness },
  crew: { label: "Crew", href: "/crew", icon: Truck },
  dispatch: { label: "Dispatch", href: "/dispatch", icon: LayoutDashboard },
  admin: { label: "Admin", href: "/admin", icon: LifeBuoy },
} as const;
