import { Suspense } from "react";
import { isAddress, getAddress } from "viem";
import { Logo, ErrorNote, Skeleton } from "@/components/ui";
import { Pay } from "./pay";

export default function PayPage({ params }: PageProps<"/pay/[borrower]">) {
  return (
    <div className="relative min-h-[100dvh]">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <header className="relative mx-auto flex h-16 max-w-xl items-center px-4"><Logo /></header>
      <main className="relative mx-auto w-full max-w-xl px-4 pb-16 pt-4">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Resolve params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Resolve({ params }: { params: PageProps<"/pay/[borrower]">["params"] }) {
  const { borrower } = await params;
  if (!isAddress(borrower, { strict: false })) return <ErrorNote>This payment link is broken. Ask for a new one.</ErrorNote>;
  return <Pay borrower={getAddress(borrower)} />;
}
