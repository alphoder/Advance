import { Suspense } from "react";
import { isAddress, getAddress } from "viem";
import { Nav, Footer, ErrorNote, Spinner } from "@/components/ui";
import { Pay } from "./pay";

export default function PayPage({ params }: PageProps<"/pay/[borrower]">) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-md px-4 pt-6 sm:px-6">
        <Suspense fallback={<div className="py-10 text-center"><Spinner /></div>}>
          <Resolve params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function Resolve({ params }: { params: PageProps<"/pay/[borrower]">["params"] }) {
  const { borrower } = await params;
  if (!isAddress(borrower, { strict: false })) return <ErrorNote>This payment link is broken. Ask for a new one.</ErrorNote>;
  return <Pay borrower={getAddress(borrower)} />;
}
