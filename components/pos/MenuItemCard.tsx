import { Minus, Plus } from "lucide-react";
import { formatINR } from "@/lib/pos/money";
import type { MenuItem } from "@/lib/pos/menu";

export function DietMark({ diet }: { diet: MenuItem["diet"] }) {
  const color = diet === "veg" ? "border-avail text-avail" : "border-danger text-danger";
  return (
    <span className={`mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border-[1.5px] ${color}`} title={diet === "veg" ? "Vegetarian" : "Non-vegetarian"}>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="sr-only">{diet === "veg" ? "Vegetarian" : "Non-vegetarian"}</span>
    </span>
  );
}

/**
 * Compact dish tile. Tap anywhere on it to add one. Once added, the bottom strip becomes a full-width
 * − qty + stepper, so the controls stay easy to hit however narrow the tile is.
 */
export function MenuItemCard({ item, qty, onAdd, onRemove }: { item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void }) {
  const added = qty > 0;
  return (
    <div className={`flex min-w-0 flex-col rounded-md bg-surface shadow-card ${added ? "border-2 border-brand" : "border border-line p-px"}`}>
      <button type="button" onClick={onAdd} className="flex flex-1 flex-col gap-1 rounded-t-md p-2.5 pb-2 text-left" aria-label={`Add ${item.name}, ${formatINR(item.price)}`}>
        <span className="flex gap-1.5">
          <DietMark diet={item.diet} />
          <span className="line-clamp-2 text-label font-semibold leading-[18px] break-words">{item.name}</span>
        </span>
        <span className="mt-auto flex items-baseline gap-1.5 pt-1">
          <span className="text-body font-semibold tabular-nums">{formatINR(item.price)}</span>
          {item.portion && <span className="truncate text-caption text-ink-2">{item.portion}</span>}
        </span>
      </button>
      {added ? (
        <div className="flex items-center gap-1 p-1 pt-0" role="group" aria-label={`Quantity for ${item.name}`}>
          <button type="button" onClick={onRemove} aria-label={`Remove one ${item.name}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-sm bg-muted hover:bg-line">
            <Minus size={18} />
          </button>
          <span className="w-8 text-center text-body font-bold tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button type="button" onClick={onAdd} aria-label={`Add one ${item.name}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-sm bg-brand text-white hover:bg-brand-hover">
            <Plus size={18} />
          </button>
        </div>
      ) : (
        <div className="p-1 pt-0">
          <button type="button" onClick={onAdd} tabIndex={-1} aria-hidden className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-sm bg-brand-soft text-label font-semibold text-brand hover:bg-brand hover:text-white">
            <Plus size={16} /> Add
          </button>
        </div>
      )}
    </div>
  );
}
