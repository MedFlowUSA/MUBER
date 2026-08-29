import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  FileCheck2,
  House,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareWarning,
  MessagesSquare,
  PackageSearch,
  Truck,
  Users,
} from "lucide-react";
export const publicNav = [
  { label: "How it works", href: "/#how" },
  { label: "Service area", href: "/#area" },
  { label: "Reviews", href: "/reviews" },
  { label: "For contractors", href: "/provider" },
  { label: "Support", href: "/support" },
] as const;
export const portalMenus = {
  customer: [
    { label: "My requests", href: "/customer", icon: House },
    { label: "Book Move It", href: "/book/move", icon: Truck },
    { label: "Book Remove It", href: "/book/remove", icon: PackageSearch },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Messages", href: "/messages", icon: MessagesSquare },
    { label: "Support", href: "/support", icon: LifeBuoy },
  ],
  provider: [
    {
      label: "Contractor home",
      href: "/provider/dashboard",
      icon: BriefcaseBusiness,
    },
    {
      label: "Company profile",
      href: "/provider/profile",
      icon: BriefcaseBusiness,
    },
    { label: "Job offers", href: "/provider/offers", icon: ClipboardList },
    { label: "Scheduled jobs", href: "/provider/jobs", icon: LayoutDashboard },
    {
      label: "Availability",
      href: "/provider/availability",
      icon: ClipboardList,
    },
    { label: "Vehicles & crews", href: "/provider/fleet", icon: Truck },
    { label: "Credentials", href: "/provider/credentials", icon: BadgeCheck },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Messages", href: "/messages", icon: MessagesSquare },
    { label: "Support", href: "/support", icon: LifeBuoy },
  ],
  crew: [
    { label: "Crew assignments", href: "/crew", icon: Users },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Messages", href: "/messages", icon: MessagesSquare },
    { label: "Support", href: "/support", icon: LifeBuoy },
  ],
  dispatch: [
    { label: "Dispatch queue", href: "/dispatch", icon: LayoutDashboard },
    {
      label: "Completion review",
      href: "/dispatch/completions",
      icon: FileCheck2,
    },
    {
      label: "Incidents",
      href: "/dispatch/incidents",
      icon: MessageSquareWarning,
    },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Messages", href: "/messages", icon: MessagesSquare },
  ],
  admin: [
    { label: "Admin home", href: "/admin", icon: LifeBuoy },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Messages", href: "/messages", icon: MessagesSquare },
  ],
} as const;
