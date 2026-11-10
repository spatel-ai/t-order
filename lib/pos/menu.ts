import { rupees } from "./money";

export const CATEGORIES = ["Starters", "Mains", "Breads", "Beverages", "Desserts"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: Category;
  /** paise */
  price: number;
  diet: "veg" | "nonveg";
  portion: string;
}

export const MENU: MenuItem[] = [
  { id: "paneer-tikka", code: "PT", name: "Paneer Tikka", category: "Starters", price: rupees(260), diet: "veg", portion: "6 pcs" },
  { id: "chicken-65", code: "C65", name: "Chicken 65", category: "Starters", price: rupees(290), diet: "nonveg", portion: "8 pcs" },
  { id: "paneer-butter-masala", code: "PBM", name: "Paneer Butter Masala", category: "Mains", price: rupees(250), diet: "veg", portion: "Serves 1" },
  { id: "dal-makhani", code: "DM", name: "Dal Makhani", category: "Mains", price: rupees(220), diet: "veg", portion: "Serves 1" },
  { id: "chicken-tikka-masala", code: "CTM", name: "Chicken Tikka Masala", category: "Mains", price: rupees(340), diet: "nonveg", portion: "Serves 1" },
  { id: "veg-biryani", code: "VB", name: "Veg Biryani", category: "Mains", price: rupees(180), diet: "veg", portion: "Serves 1" },
  { id: "butter-naan", code: "BN", name: "Butter Naan", category: "Breads", price: rupees(50), diet: "veg", portion: "1 pc" },
  { id: "garlic-naan", code: "GN", name: "Garlic Naan", category: "Breads", price: rupees(60), diet: "veg", portion: "1 pc" },
  { id: "water-bottle", code: "WB", name: "Water Bottle", category: "Beverages", price: rupees(20), diet: "veg", portion: "1 L" },
  { id: "masala-chaas", code: "MC", name: "Masala Chaas", category: "Beverages", price: rupees(60), diet: "veg", portion: "300 ml" },
  { id: "gulab-jamun", code: "GJ", name: "Gulab Jamun", category: "Desserts", price: rupees(80), diet: "veg", portion: "2 pcs" },
  { id: "rasmalai", code: "RM", name: "Rasmalai", category: "Desserts", price: rupees(110), diet: "veg", portion: "2 pcs" },
];

const BY_ID = new Map(MENU.map((m) => [m.id, m]));

export function menuItem(id: string): MenuItem {
  const m = BY_ID.get(id);
  if (!m) throw new Error(`Unknown menu item: ${id}`);
  return m;
}

export function searchMenu(query: string, category: Category | "All"): MenuItem[] {
  const q = query.trim().toLowerCase();
  return MENU.filter(
    (m) =>
      (category === "All" || m.category === category) &&
      (!q || m.name.toLowerCase().includes(q) || m.code.toLowerCase() === q),
  );
}
