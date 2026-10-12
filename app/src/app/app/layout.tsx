import { Suspense } from "react";
import { AppShell } from "@/components/app/shell";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
