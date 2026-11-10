"use client";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { categoriesOf, searchMenu, type MenuItem } from "@/lib/pos/menu";
import { usePosData } from "@/lib/pos/store";
import type { Cart } from "@/lib/pos/types";
import { FilterControl } from "./FilterControl";
import { MenuItemCard } from "./MenuItemCard";
import { SearchInput } from "./SearchInput";

// As many tiles per row as fit, never narrower than 140px: 2 on a phone, more as the screen grows.
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2";

/**
 * Dish picker. Wide screens: a category rail on the left that stays put while the dishes scroll.
 * Narrow screens (and `dense`, used inside drawers): one row of category pills that scrolls sideways.
 * With "All" selected, dishes are grouped under category headings.
 */
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
  const [picked, setCategory] = useState("All");
  const menu = usePosData()?.menu ?? [];
  const categories = categoriesOf(menu);
  // A menu upload (possibly from another tab) can remove the selected category.
  const category = categories.includes(picked) ? picked : "All";
  const items = searchMenu(menu, query, category);

  if (menu.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-muted px-6 py-12 text-center">
        <p className="text-h2">No menu yet</p>
        <p className="text-body text-ink-2">Upload your menu once, then dishes appear here to order.</p>
        <ButtonLink href="/menu">Upload menu</ButtonLink>
      </div>
    );
  }

  const options = [
    { value: "All", label: "All", count: menu.length },
    ...categories.map((c) => ({ value: c, label: c, count: menu.filter((m) => m.category === c).length })),
  ];
  const tiles = (list: MenuItem[]) => (
    <div className={GRID}>
      {list.map((m) => (
        <MenuItemCard key={m.id} item={m} qty={cart[m.id] ?? 0} onAdd={() => onAdd(m)} onRemove={() => onRemove(m)} />
      ))}
    </div>
  );
  const groups = category === "All" ? categoriesOf(items) : [];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Search and categories stay in reach while the dish list scrolls. */}
      <div className={`z-20 flex min-w-0 flex-col gap-2 py-2 ${dense ? "sticky top-0 bg-surface" : "sticky top-[73px] bg-canvas"}`}>
        <SearchInput className={dense ? "" : "lg:max-w-sm"} value={query} onChange={setQuery} placeholder="Search dishes or codes" label="Search menu" />
        <FilterControl<string> className={dense ? "" : "lg:hidden"} label="Menu category" value={category} onChange={setCategory} options={options} />
      </div>
      <div className={dense ? "" : "lg:grid lg:grid-cols-[156px_minmax(0,1fr)] lg:items-start lg:gap-4"}>
        {!dense && (
          <FilterControl<string>
            layout="rail"
            className="sticky top-[149px] hidden max-h-[calc(100dvh-165px)] overflow-y-auto rounded-lg border border-line bg-surface p-1 lg:flex"
            label="Menu category"
            value={category}
            onChange={setCategory}
            options={options}
          />
        )}
        <div className="flex min-w-0 flex-col gap-4">
          {items.length === 0 ? (
            <p className="rounded-md bg-muted p-6 text-center text-body text-ink-2">{query ? `No dishes match “${query}”.` : "No dishes in this category."}</p>
          ) : groups.length > 1 ? (
            groups.map((c) => (
              <section key={c} aria-label={c} className="flex flex-col gap-2">
                <h3 className="text-label text-ink-2">{c}</h3>
                {tiles(items.filter((m) => m.category === c))}
              </section>
            ))
          ) : (
            tiles(items)
          )}
        </div>
      </div>
    </div>
  );
}
