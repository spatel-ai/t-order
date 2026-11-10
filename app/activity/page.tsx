"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FilterControl } from "@/components/pos/FilterControl";
import { OrderHistoryItem } from "@/components/pos/OrderHistoryItem";
import { BackLink, WithData } from "@/components/pos/Shell";
import { ButtonLink } from "@/components/ui/Button";
import { formatINR } from "@/lib/pos/money";
import { findSession, sessionBill } from "@/lib/pos/selectors";
import { useSessionState } from "@/lib/pos/store";
import { formatDate, formatDuration, formatTime } from "@/lib/pos/time";
import type { ActivityType, PosData } from "@/lib/pos/types";

type Group = "all" | "orders" | "changes" | "payments";
const GROUPS: Record<Exclude<Group, "all">, ActivityType[]> = {
  orders: ["created", "added"],
  changes: ["cancelled", "transferred", "swapped"],
  payments: ["billed", "paid", "released"],
};

export default function ActivityPage() {
  return (
    <Suspense>
      <WithData>{(data) => <Activity data={data} />}</WithData>
    </Suspense>
  );
}

function Activity({ data }: { data: PosData }) {
  const sessionId = useSearchParams().get("session");
  const [group, setGroup] = useSessionState<Group>("activityFilter", "all");
  const session = sessionId ? findSession(data, sessionId) : undefined;
  const scoped = session ? data.activity.filter((e) => e.sessionIds.includes(session.id)) : data.activity;
  const events = [...scoped].filter((e) => group === "all" || GROUPS[group].includes(e.type)).sort((x, y) => x.at.localeCompare(y.at));
  const count = (g: Exclude<Group, "all">) => scoped.filter((e) => GROUPS[g].includes(e.type)).length;

  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const day = formatDate(e.at);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4 lg:px-8">
      <BackLink href="/" label="Tables" />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <h1 className="text-h1 lg:flex-1">{session ? `Activity · Session ${session.id}` : "Order activity"}</h1>
        <FilterControl<Group>
          label="Event type"
          value={group}
          onChange={setGroup}
          options={[
            { value: "all", label: "All events", count: scoped.length },
            { value: "orders", label: "Orders", count: count("orders") },
            { value: "changes", label: "Changes", count: count("changes") },
            { value: "payments", label: "Payments", count: count("payments") },
          ]}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-line bg-surface p-4 lg:p-6" aria-label="Timeline">
          {events.length === 0 && <p className="py-8 text-center text-body text-ink-2">No events yet.</p>}
          {[...byDay.entries()].map(([day, list]) => (
            <div key={day}>
              <h2 className="pt-2 text-caption uppercase tracking-wide text-ink-2">{day}</h2>
              <ol className="divide-y divide-line">
                {list.map((e) => (
                  <li key={e.id}>
                    <OrderHistoryItem event={e} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
        {session ? (
          <SessionSummary data={data} sessionId={session.id} />
        ) : (
          <aside className="flex h-fit flex-col gap-2 rounded-lg border border-line bg-surface p-4 text-body text-ink-2">
            Open a session’s log from its order page or receipt to see only that dining session.
          </aside>
        )}
      </div>
    </div>
  );
}

function SessionSummary({ data, sessionId }: { data: PosData; sessionId: string }) {
  const s = findSession(data, sessionId)!;
  const bill = sessionBill(s);
  const rows: [string, string][] = [
    ["Status", s.status === "paid" ? "Closed · Paid" : s.status === "billing" ? "Billing" : "Open"],
    ["Tables", s.tableHistory.join(" → ")],
    ["Started", formatTime(s.startedAt)],
    ...(s.closedAt ? ([["Closed", `${formatTime(s.closedAt)} (${formatDuration(s.startedAt, new Date(s.closedAt).getTime())})`]] as [string, string][]) : []),
    ["Order entries", `${s.entries.length} (${bill.itemCount} items)`],
    ["Subtotal", formatINR(bill.subtotal, { decimals: "always" })],
    ["GST 5%", formatINR(bill.tax, { decimals: "always" })],
    ["Grand total", formatINR(bill.total, { decimals: "always" })],
    ...(s.payment ? ([["Payment", `${s.payment.method}${s.payment.txnId ? ` · ${s.payment.txnId}` : ""}`]] as [string, string][]) : []),
  ];
  return (
    <aside className="flex h-fit flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="text-h2">Session {s.id}</h2>
      <dl className="flex flex-col gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-body">
            <dt className="text-ink-2">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {s.payment ? (
        <ButtonLink href={`/receipt/${s.id}`} variant="secondary" size="md">
          View receipt
        </ButtonLink>
      ) : (
        <ButtonLink href={`/tables/${s.tableId}`} variant="secondary" size="md">
          Open Table {s.tableId}
        </ButtonLink>
      )}
    </aside>
  );
}
