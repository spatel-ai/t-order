import { ArrowLeftRight, ArrowRight, Check, FileText, LogOut, Plus, Utensils, X } from "lucide-react";
import { formatINR } from "@/lib/pos/money";
import type { ActivityEvent, ActivityType } from "@/lib/pos/types";
import { formatTime } from "@/lib/pos/time";

const ICONS: Record<ActivityType, { icon: typeof Plus; cls: string }> = {
  created: { icon: Utensils, cls: "bg-brand-soft text-brand" },
  added: { icon: Plus, cls: "bg-occ-soft text-occ" },
  cancelled: { icon: X, cls: "bg-danger-soft text-danger" },
  transferred: { icon: ArrowRight, cls: "bg-bill-soft text-bill" },
  swapped: { icon: ArrowLeftRight, cls: "bg-resv-soft text-resv" },
  billed: { icon: FileText, cls: "bg-bill-soft text-bill" },
  paid: { icon: Check, cls: "bg-avail-soft text-avail" },
  released: { icon: LogOut, cls: "bg-avail-soft text-avail" },
};

export function OrderHistoryItem({ event, compact = false }: { event: ActivityEvent; compact?: boolean }) {
  const { icon: Icon, cls } = ICONS[event.type];
  const amount =
    event.amount === undefined ? "—" : event.type === "added" ? `+${formatINR(event.amount)}` : formatINR(event.amount);
  return (
    <div className="flex min-w-0 items-start gap-3 py-3">
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${cls}`} aria-hidden>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{event.title}</p>
        <p className={`text-caption text-ink-2 ${compact ? "truncate" : ""}`}>{event.detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-body font-semibold tabular-nums">{amount}</span>
        <time dateTime={event.at} className="text-caption text-ink-2">
          {formatTime(event.at)}
        </time>
      </div>
    </div>
  );
}
