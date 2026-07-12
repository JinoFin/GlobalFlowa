import { AppShell } from "@/components/app-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <AppShell type="portal">{children}</AppShell>;
}
