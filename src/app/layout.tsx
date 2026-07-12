import type { Metadata } from "next";
import { ApplicationChrome } from "@/components/application-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Globalflowa | Germany Market Entry Portal",
    template: "%s | Globalflowa",
  },
  description:
    "Germany market-entry, compliance, warehouse, labeling, packing and marketplace preparation support for foreign sellers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-navy-950">
        <ApplicationChrome>{children}</ApplicationChrome>
      </body>
    </html>
  );
}
