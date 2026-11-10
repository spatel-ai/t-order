import { rupees } from "./money";

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: string;
  /** paise */
  price: number;
  diet: "veg" | "nonveg";
  portion: string;
}

export function findMenuItem(menu: MenuItem[], id: string): MenuItem | undefined {
  return menu.find((m) => m.id === id);
}

/** Categories in the order they first appear in the menu. */
export function categoriesOf(menu: MenuItem[]): string[] {
  return [...new Set(menu.map((m) => m.category))];
}

export function searchMenu(menu: MenuItem[], query: string, category: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  return menu.filter(
    (m) =>
      (category === "All" || m.category === category) &&
      (!q || m.name.toLowerCase().includes(q) || m.code.toLowerCase() === q),
  );
}

// ---------- bulk import / export ----------

export const MAX_MENU_ITEMS = 2000;

export interface MenuImportResult {
  items: MenuItem[];
  /** Human-readable problems. Rows with a problem are skipped. */
  errors: string[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 4);

function parseDiet(row: Record<string, unknown>): MenuItem["diet"] | null {
  if (typeof row.veg === "boolean") return row.veg ? "veg" : "nonveg";
  if (row.diet === undefined || row.diet === null || row.diet === "") return "veg";
  const d = String(row.diet).toLowerCase().replace(/[^a-z]/g, "");
  if (d === "veg" || d === "vegetarian") return "veg";
  if (d === "nonveg" || d === "nonvegetarian" || d === "egg") return "nonveg";
  return null;
}

/**
 * Parses an uploaded menu file. Accepts a JSON array of items, or an object with an `items` / `menu` array.
 * Each item: { name, price (in rupees), category?, diet? ("veg" | "nonveg") or veg? (boolean), portion?, code?, id? }.
 */
export function parseMenuJson(text: string): MenuImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { items: [], errors: [`This file is not valid JSON (${e instanceof Error ? e.message : "parse error"}).`] };
  }
  const obj = parsed as { items?: unknown; menu?: unknown } | null;
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(obj?.items) ? obj.items : Array.isArray(obj?.menu) ? obj.menu : null;
  if (!rows) return { items: [], errors: ['Expected a JSON array of items, or an object like { "items": [ … ] }.'] };
  if (rows.length === 0) return { items: [], errors: ["The file contains no menu items."] };
  if (rows.length > MAX_MENU_ITEMS) return { items: [], errors: [`Too many items (${rows.length}). The limit is ${MAX_MENU_ITEMS}.`] };

  const items: MenuItem[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rows.forEach((raw: unknown, index: number) => {
    const where = `Item ${index + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void errors.push(`${where}: must be an object.`);
    const row = raw as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) return void errors.push(`${where}: "name" is required.`);
    const label = `${where} (${name})`;

    const priceNum = typeof row.price === "string" ? Number(row.price.replace(/[₹,\s]/g, "")) : row.price;
    if (typeof priceNum !== "number" || !Number.isFinite(priceNum) || priceNum <= 0)
      return void errors.push(`${label}: "price" must be a number of rupees greater than 0.`);
    if (priceNum > 1_000_000) return void errors.push(`${label}: "price" is too large.`);

    const diet = parseDiet(row);
    if (!diet) return void errors.push(`${label}: "diet" must be "veg" or "nonveg".`);

    const id = slug(typeof row.id === "string" && row.id.trim() ? row.id : name);
    if (!id) return void errors.push(`${label}: could not derive an id; add an "id" field.`);
    if (seen.has(id)) return void errors.push(`${label}: duplicate of an earlier item with id "${id}".`);
    seen.add(id);

    const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");
    items.push({
      id,
      code: str(row.code).toUpperCase() || initials(name),
      name,
      category: str(row.category) || "Other",
      price: rupees(priceNum),
      diet,
      portion: str(row.portion),
    });
  });

  return { items, errors };
}

/** Adds new items and updates existing ones (matched by id); items not in `incoming` are kept. */
export function mergeMenus(current: MenuItem[], incoming: MenuItem[]): MenuItem[] {
  const byId = new Map(incoming.map((m) => [m.id, m]));
  const merged = current.map((m) => byId.get(m.id) ?? m);
  const existing = new Set(current.map((m) => m.id));
  return [...merged, ...incoming.filter((m) => !existing.has(m.id))];
}

/** The same shape `parseMenuJson` accepts, so an export can be edited and uploaded back. */
export function menuToJson(menu: MenuItem[]): string {
  return JSON.stringify(
    {
      items: menu.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        price: m.price / 100,
        diet: m.diet,
        portion: m.portion,
      })),
    },
    null,
    2,
  );
}
