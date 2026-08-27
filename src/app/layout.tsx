import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://muberapp.vercel.app"),
  title: { default: "MUBER | Move It. Remove It.", template: "%s | MUBER" },
  description:
    "A managed marketplace for moving and junk removal, now serving Southern California and expanding nationwide.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/muber-app-icon.png",
    apple: "/brand/muber-app-icon.png",
  },
};
export const viewport: Viewport = {
  themeColor: "#102A43",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
