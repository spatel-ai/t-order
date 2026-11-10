"use client";
import { Check, History, Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { EmptyState, WithData } from "@/components/pos/Shell";
import { PrintPortal, ThermalBill } from "@/components/pos/ThermalBill";
import { Button, ButtonLink } from "@/components/ui/Button";
import { findSession, sessionBill } from "@/lib/pos/selectors";

export default function ReceiptPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <WithData>
      {(data) => {
        const s = findSession(data, decodeURIComponent(sessionId));
        if (!s?.payment) return <EmptyState title="No receipt yet" body={`Session ${sessionId} has not been paid.`} action={{ href: "/", label: "Back to tables" }} />;
        const receipt = <ThermalBill settings={data.settings} session={s} bill={sessionBill(s)} at={s.payment.paidAt} cashier={s.payment.by} />;
        return (
          <div className="flex flex-col items-center gap-8 px-4 py-8 lg:flex-row lg:items-start lg:justify-center">
            {/* On-screen preview of exactly what the thermal printer produces. */}
            <article aria-label="Receipt" className="w-full max-w-[340px] rounded-sm border border-line bg-white p-5 shadow-card">
              {receipt}
            </article>
            <div className="flex w-full max-w-[320px] flex-col gap-3">
              <div className="flex items-center gap-3 rounded-lg bg-avail-soft p-4">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-avail text-white">
                  <Check size={20} aria-hidden />
                </span>
                <div>
                  <p className="text-h2">Payment successful</p>
                  <p className="text-caption text-avail">Session closed · Table {s.tableId} released</p>
                </div>
              </div>
              <Button variant="secondary" icon={<Printer size={20} />} onClick={() => window.print()}>
                Print receipt
              </Button>
              <p className="text-caption text-ink-2">
                Prints on the {data.settings.paperWidth} mm thermal roll. Pick the receipt printer in the print dialog and turn off headers and footers.
              </p>
              <ButtonLink href={`/activity?session=${s.id}`} variant="ghost" icon={<History size={20} />}>
                View activity timeline
              </ButtonLink>
              <ButtonLink href="/">Done · Back to Tables</ButtonLink>
            </div>
            <PrintPortal paperWidth={data.settings.paperWidth}>{receipt}</PrintPortal>
          </div>
        );
      }}
    </WithData>
  );
}
