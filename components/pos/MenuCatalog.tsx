"use client";
import { useState } from "react";
import { CATEGORIES, MENU, searchMenu, type Category, type MenuItem } from "@/lib/pos/menu";
import type { Cart } from "@/lib/pos/types";
import { FilterControl } from "./FilterControl";
import { MenuItemCard } from "./MenuItemCard";
import { SearchInput } from "./SearchInput";

export function MenuCatalog({
  cart,
  onAdd,
  onRemove,
  dense = false,
}: {
  cart: Cart;
  onAdd: (item: MenuItem) => void;
  onRemove: (item: MenuItem) => void;
  dense?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const items = searchMenu(query, category);
  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-col gap-3 ${dense ? "" : "lg:flex-row lg:items-center"}`}>
        <SearchInput className={dense ? "" : "lg:w-64"} value={query} onChange={setQuery} placeholder="Search dishes or codes (e.g. PBM)" label="Search menu" />
        <FilterControl<Category | "All">
          label="Menu category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "All", label: "All", count: MENU.length },
            ...CATEGORIES.map((c) => ({ value: c, label: c, count: MENU.filter((m) => m.category === c).length })),
          ]}
        />
      </div>
      {items.length === 0 ? (
        <p className="rounded-md bg-muted p-6 text-center text-body text-ink-2">No dishes match “{query}”.</p>
      ) : (
        <div className={`grid gap-3 ${dense ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 2xl:grid-cols-4"}`}>
          {items.map((m) => (
            <MenuItemCard key={m.id} item={m} qty={cart[m.id] ?? 0} onAdd={() => onAdd(m)} onRemove={() => onRemove(m)} />
          ))}
        </div>
      )}
    </div>
  );
}
