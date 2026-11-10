import type { TableStatus } from "@/lib/pos/types";

const STYLES: Record<TableStatus, { label: string; bg: string; fg: string; dot: string }> = {
  available: { label: "Available", bg: "bg-avail-soft", fg: "text-avail", dot: "bg-avail" },
  occupied: { label: "Occupied", bg: "bg-occ-soft", fg: "text-occ", dot: "bg-occ" },
  billing: { label: "Billing", bg: "bg-bill-soft", fg: "text-bill", dot: "bg-bill" },
  reserved: { label: "Reserved", bg: "bg-resv-soft", fg: "text-resv", dot: "bg-resv" },
};

export const STATUS_BAR: Record<TableStatus, string> = {
  available: "bg-avail",
  occupied: "bg-occ",
  billing: "bg-bill",
  reserved: "bg-resv",
};

/** Colour + dot + text, so status is never conveyed by colour alone. */
export function StatusBadge({ status }: { status: TableStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-label ${s.bg} ${s.fg}`}>
      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
