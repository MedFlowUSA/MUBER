import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://muber.example"),
  title: { default: "MUBER | Move It. Remove It.", template: "%s | MUBER" },
  description: "Book moving and junk removal with verified local professionals across Redlands and the Inland Empire.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/muber-app-icon.png", apple: "/brand/muber-app-icon.png" },
};
export const viewport: Viewport = { themeColor: "#102A43", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ToastProvider>{children}</ToastProvider></body></html>;
}
