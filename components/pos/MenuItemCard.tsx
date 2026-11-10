import { Plus } from "lucide-react";
import { formatINR } from "@/lib/pos/money";
import type { MenuItem } from "@/lib/pos/menu";
import { QuantityStepper } from "./QuantityStepper";

export function DietMark({ diet }: { diet: MenuItem["diet"] }) {
  const color = diet === "veg" ? "border-avail text-avail" : "border-danger text-danger";
  return (
    <span className={`mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border-[1.5px] ${color}`} title={diet === "veg" ? "Vegetarian" : "Non-vegetarian"}>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="sr-only">{diet === "veg" ? "Vegetarian" : "Non-vegetarian"}</span>
    </span>
  );
}

/** Tap the tile (or +) to add. Once added it shows a compact stepper and a green outline. */
export function MenuItemCard({ item, qty, onAdd, onRemove }: { item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void }) {
  const added = qty > 0;
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card ${added ? "border-2 border-brand p-[15px]" : "border border-line"}`}
    >
      <button type="button" onClick={onAdd} className="flex flex-1 flex-col gap-1 text-left" aria-label={`Add ${item.name}, ${formatINR(item.price)}`}>
        <span className="flex gap-2">
          <DietMark diet={item.diet} />
          <span className="text-body font-semibold">{item.name}</span>
        </span>
        <span className="text-caption text-ink-2">
          {item.category} · {item.portion}
        </span>
      </button>
      <div className="flex min-h-11 items-center justify-between gap-2">
        <span className="text-body font-semibold">{formatINR(item.price)}</span>
        {added ? (
          <QuantityStepper size="compact" value={qty} label={item.name} onIncrement={onAdd} onDecrement={onRemove} />
        ) : (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${item.name}`}
            className="inline-flex size-11 items-center justify-center rounded-md bg-brand-soft text-brand hover:bg-brand hover:text-white"
          >
            <Plus size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
