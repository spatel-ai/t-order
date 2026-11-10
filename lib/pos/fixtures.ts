// Test fixture only: a busy floor (tables 3, 4, 6, 9 occupied; 8, 12 reserved) with a sample menu.
// The app itself starts blank; see seed.ts.
import { findMenuItem, type MenuItem } from "./menu";
import { DEFAULT_SETTINGS } from "./settings";
import { rupees } from "./money";
import type { ActivityEvent, DiningSession, PosData, Table, TableId } from "./types";

export const DEMO_MENU: MenuItem[] = [
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


const SEATS: Record<TableId, number> = { 1: 4, 2: 4, 3: 4, 4: 2, 5: 2, 6: 6, 7: 6, 8: 4, 9: 2, 10: 4, 11: 8, 12: 6 };

export function createDemoData(now = new Date()): PosData {
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();

  const tables: Table[] = (Object.keys(SEATS) as TableId[]).map((id) => ({ id, seats: SEATS[id] }));
  tables.find((t) => t.id === "8")!.reservation = { name: "Mehta", time: "8:30 PM", guests: 4 };
  tables.find((t) => t.id === "12")!.reservation = { name: "Khan", time: "9:00 PM", guests: 6 };

  const session = (
    id: string,
    tableId: TableId,
    minutesAgo: number,
    guests: number,
    lines: [string, number][],
    status: DiningSession["status"] = "open",
  ): DiningSession => ({
    id,
    tableId,
    status,
    guests,
    startedAt: ago(minutesAgo),
    tableHistory: [tableId],
    discount: 0,
    entries: [
      {
        id: `${id}-E1`,
        no: 1,
        sentAt: ago(minutesAgo),
        by: "Anantram Patel",
        items: lines.map(([menuId, qty], i) => {
          const m = findMenuItem(DEMO_MENU, menuId)!;
          return { lineId: `${id}-E1-L${i + 1}`, menuId, name: m.name, price: m.price, qty };
        }),
      },
    ],
  });

  const sessions: DiningSession[] = [
    // ₹1,240 · 7 items
    session("S-1038", "3", 55, 4, [["chicken-tikka-masala", 1], ["dal-makhani", 1], ["chicken-65", 1], ["rasmalai", 3], ["garlic-naan", 1]]),
    // ₹860 · 4 items
    session("S-1040", "4", 20, 2, [["paneer-tikka", 1], ["chicken-tikka-masala", 1], ["veg-biryani", 1], ["gulab-jamun", 1]]),
    // ₹2,150 · 11 items, bill printed
    session("S-1031", "6", 80, 6, [["chicken-tikka-masala", 2], ["paneer-butter-masala", 2], ["chicken-65", 1], ["dal-makhani", 1], ["butter-naan", 4], ["paneer-tikka", 1]], "billing"),
    // ₹470 · 3 items
    session("S-1041", "9", 12, 2, [["chicken-tikka-masala", 1], ["rasmalai", 1], ["water-bottle", 1]]),
  ];

  let ev = 1;
  const event = (e: Omit<ActivityEvent, "id">): ActivityEvent => ({ id: `ev-${ev++}`, ...e });
  const activity: ActivityEvent[] = [
    event({ type: "created", at: ago(80), by: "Anantram Patel", sessionIds: ["S-1031"], tables: ["6"], title: "Session S-1031 started · Order #1 · Table 6", detail: "11 items sent to kitchen", amount: rupees(2150) }),
    event({ type: "created", at: ago(55), by: "Anantram Patel", sessionIds: ["S-1038"], tables: ["3"], title: "Session S-1038 started · Order #1 · Table 3", detail: "7 items sent to kitchen", amount: rupees(1240) }),
    event({ type: "billed", at: ago(25), by: "Anantram Patel", sessionIds: ["S-1031"], tables: ["6"], title: "Bill generated · Table 6", detail: "Session S-1031 moved to billing", amount: rupees(2257.5) }),
    event({ type: "created", at: ago(20), by: "Anantram Patel", sessionIds: ["S-1040"], tables: ["4"], title: "Session S-1040 started · Order #1 · Table 4", detail: "4 items sent to kitchen", amount: rupees(860) }),
    event({ type: "created", at: ago(12), by: "Anantram Patel", sessionIds: ["S-1041"], tables: ["9"], title: "Session S-1041 started · Order #1 · Table 9", detail: "3 items sent to kitchen", amount: rupees(470) }),
    event({ type: "paid", at: ago(4), by: "Anantram Patel", sessionIds: ["S-1029"], tables: ["5"], title: "Paid via Card · Table 5", detail: "Session S-1029 closed · table released", amount: rupees(1365) }),
  ];

  return {
    version: 1,
    tables,
    sessions,
    activity,
    seq: { session: 1042, invoice: 2611457, event: ev, txn: 88213 },
    menu: structuredClone(DEMO_MENU),
    settings: { ...DEFAULT_SETTINGS },
  };
}
