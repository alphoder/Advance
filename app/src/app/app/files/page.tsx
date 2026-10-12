"use client";

import { Gate } from "@/components/app/shell";
import { PageHeader } from "@/components/app/bits";
import { CreditFileCard, SharedWithMe } from "@/components/vault";

export default function FilesPage() {
  return (
    <Gate>
      <PageHeader
        title="My documents"
        help={["Add an invoice or contract that shows your income.", "It's locked on your device before it's stored; only your passkey can unlock it.", "To show it to a lender, paste their address and tap Share. Only they can open it."]}
        sub="Invoices and contracts that prove your income, locked with a second key that only your passkey can recreate. Stored encrypted on Monad. Share one with a single lender."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7"><CreditFileCard /></div>
        <div className="lg:col-span-5"><SharedWithMe /></div>
      </div>
    </Gate>
  );
}
