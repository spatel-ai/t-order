"use client";
import { Download, FileJson, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { DietMark } from "@/components/pos/MenuItemCard";
import { WithData } from "@/components/pos/Shell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Overlay";
import { importMenu } from "@/lib/pos/actions";
import { categoriesOf, menuToJson, parseMenuJson, type MenuImportResult } from "@/lib/pos/menu";
import { formatINR } from "@/lib/pos/money";
import { dispatch, showToast } from "@/lib/pos/store";
import type { PosData } from "@/lib/pos/types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const SAMPLE = `{
  "items": [
    { "name": "Masala Dosa", "price": 90, "category": "South Indian", "diet": "veg", "portion": "1 pc", "code": "MD" },
    { "name": "Idli Sambar", "price": 60, "category": "South Indian", "diet": "veg", "portion": "2 pcs" },
    { "name": "Filter Coffee", "price": 30, "category": "Beverages" }
  ]
}
`;

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MenuPage() {
  return <WithData>{(data) => <MenuManager data={data} />}</WithData>;
}

function MenuManager({ data }: { data: PosData }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<(MenuImportResult & { fileName: string }) | null>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const menu = data.menu;
  const categories = categoriesOf(menu);

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return showToast("That file is larger than 2 MB. Is it the right file?", "error");
    setMode("replace");
    setPending({ ...parseMenuJson(await file.text()), fileName: file.name });
  };

  const apply = () => {
    if (!pending) return;
    if (!dispatch((d) => importMenu(d, pending.items, mode))) return;
    showToast(mode === "replace" ? `Menu saved · ${pending.items.length} items` : `${pending.items.length} items added or updated`);
    setPending(null);
  };

  const existing = new Set(menu.map((m) => m.id));
  const updates = pending ? pending.items.filter((m) => existing.has(m.id)).length : 0;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          <h1 className="text-display">Menu</h1>
          <p className="text-body text-ink-2">
            {menu.length} items · {categories.length} categories
          </p>
        </div>
        <Button variant="secondary" icon={<Download size={20} />} onClick={() => download("menu.json", menuToJson(menu))}>
          Export
        </Button>
        <Button icon={<Upload size={20} />} onClick={() => fileRef.current?.click()}>
          Upload menu JSON
        </Button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Menu JSON file" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-4 lg:grid-cols-[1fr_minmax(0,460px)] lg:p-6" aria-labelledby="format">
        <div className="flex flex-col gap-2 text-body">
          <h2 id="format" className="text-h2">
            Upload the whole menu at once
          </h2>
          <p className="text-ink-2">
            Upload one <code>.json</code> file with every dish. You get a preview with any problems listed before anything changes.
          </p>
          <ul className="list-disc pl-5 text-ink-2">
            <li>
              <strong className="text-ink">name</strong> and <strong className="text-ink">price</strong> (in rupees) are required.
            </li>
            <li>
              Optional: <code>category</code>, <code>diet</code> (<code>veg</code> / <code>nonveg</code>), <code>portion</code>, <code>code</code> (search shortcut), <code>id</code>.
            </li>
            <li>Open tables keep the names and prices they were ordered at.</li>
          </ul>
          <Button variant="ghost" size="md" className="self-start" icon={<FileJson size={16} />} onClick={() => download("menu-sample.json", SAMPLE)}>
            Download sample file
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-caption">{SAMPLE}</pre>
      </section>

      {menu.length === 0 && (
        <p className="rounded-lg bg-muted p-8 text-center text-body text-ink-2">The menu is empty. Upload a JSON file to add your dishes.</p>
      )}
      {categories.map((c) => {
        const items = menu.filter((m) => m.category === c);
        return (
          <section key={c} className="rounded-lg border border-line bg-surface p-4 lg:p-6" aria-label={c}>
            <h2 className="text-h2">
              {c} <span className="text-body font-normal text-ink-2">· {items.length}</span>
            </h2>
            <ul className="mt-2 grid gap-x-8 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
              {items.map((m) => (
                <li key={m.id} className="flex items-start gap-2 border-t border-line py-3 text-body">
                  <DietMark diet={m.diet} />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{m.name}</span>
                    <span className="block text-caption text-ink-2">{[m.code, m.portion].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatINR(m.price)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Review menu upload"
        subtitle={pending?.fileName}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button disabled={!pending?.items.length} onClick={apply} data-autofocus>
              {mode === "replace" ? `${menu.length ? "Replace" : "Import"} menu (${pending?.items.length ?? 0})` : `Add / update ${pending?.items.length ?? 0} items`}
            </Button>
          </div>
        }
      >
        {pending && (
          <div className="flex flex-col gap-4 pb-2 text-body">
            {pending.items.length > 0 && (
              <p className="rounded-md bg-avail-soft px-4 py-3 text-avail">
                <strong>{pending.items.length}</strong> valid items in <strong>{categoriesOf(pending.items).length}</strong> categories: {categoriesOf(pending.items).slice(0, 8).join(", ")}
                {categoriesOf(pending.items).length > 8 ? "…" : ""}
              </p>
            )}
            {pending.errors.length > 0 && (
              <div className="rounded-md bg-danger-soft px-4 py-3 text-danger" role="alert">
                <p className="font-semibold">
                  {pending.items.length ? `${pending.errors.length} ${pending.errors.length === 1 ? "row" : "rows"} will be skipped` : "This file can’t be imported"}
                </p>
                <ul className="mt-1 list-disc pl-5 text-caption">
                  {pending.errors.slice(0, 8).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  {pending.errors.length > 8 && <li>…and {pending.errors.length - 8} more</li>}
                </ul>
              </div>
            )}
            {pending.items.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-label text-ink-2">How should this file be applied?</legend>
                {(
                  [
                    ["replace", menu.length ? "Replace the entire menu" : "Use this file as the menu", menu.length ? `Removes the current ${menu.length} items and uses only this file.` : "The menu is empty right now."],
                    ["merge", "Add to the current menu", `${pending.items.length - updates} new, ${updates} updated. Other items stay.`],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md p-3 ${mode === value ? "border-2 border-brand bg-brand-soft p-[11px]" : "border border-line"}`}>
                    <input type="radio" name="mode" className="mt-1 accent-(--color-brand)" checked={mode === value} onChange={() => setMode(value)} />
                    <span>
                      <span className="font-semibold">{label}</span>
                      <span className="block text-caption text-ink-2">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
