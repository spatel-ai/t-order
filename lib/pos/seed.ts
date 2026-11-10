// Demo data matching the Figma file: C, D, F (billing), I occupied; H, L reserved; the rest available.
import { menuItem } from "./menu";
import { rupees } from "./money";
import type { ActivityEvent, DiningSession, PosData, Table, TableId } from "./types";

const SEATS: Record<TableId, number> = { A: 4, B: 4, C: 4, D: 2, E: 2, F: 6, G: 6, H: 4, I: 2, J: 4, K: 8, L: 6 };

export function createSeed(now = new Date()): PosData {
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();

  const tables: Table[] = (Object.keys(SEATS) as TableId[]).map((id) => ({ id, seats: SEATS[id] }));
  tables.find((t) => t.id === "H")!.reservation = { name: "Mehta", time: "8:30 PM", guests: 4 };
  tables.find((t) => t.id === "L")!.reservation = { name: "Khan", time: "9:00 PM", guests: 6 };

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
        by: "Ravi K",
        items: lines.map(([menuId, qty], i) => {
          const m = menuItem(menuId);
          return { lineId: `${id}-E1-L${i + 1}`, menuId, name: m.name, price: m.price, qty };
        }),
      },
    ],
  });

  const sessions: DiningSession[] = [
    // ₹1,240 · 7 items
    session("S-1038", "C", 55, 4, [["chicken-tikka-masala", 1], ["dal-makhani", 1], ["chicken-65", 1], ["rasmalai", 3], ["garlic-naan", 1]]),
    // ₹860 · 4 items
    session("S-1040", "D", 20, 2, [["paneer-tikka", 1], ["chicken-tikka-masala", 1], ["veg-biryani", 1], ["gulab-jamun", 1]]),
    // ₹2,150 · 11 items, bill printed
    session("S-1031", "F", 80, 6, [["chicken-tikka-masala", 2], ["paneer-butter-masala", 2], ["chicken-65", 1], ["dal-makhani", 1], ["butter-naan", 4], ["paneer-tikka", 1]], "billing"),
    // ₹470 · 3 items
    session("S-1041", "I", 12, 2, [["chicken-tikka-masala", 1], ["rasmalai", 1], ["water-bottle", 1]]),
  ];

  let ev = 1;
  const event = (e: Omit<ActivityEvent, "id">): ActivityEvent => ({ id: `ev-${ev++}`, ...e });
  const activity: ActivityEvent[] = [
    event({ type: "created", at: ago(80), by: "Ravi K", sessionIds: ["S-1031"], tables: ["F"], title: "Session S-1031 started · Order #1 · Table F", detail: "11 items sent to kitchen", amount: rupees(2150) }),
    event({ type: "created", at: ago(55), by: "Ravi K", sessionIds: ["S-1038"], tables: ["C"], title: "Session S-1038 started · Order #1 · Table C", detail: "7 items sent to kitchen", amount: rupees(1240) }),
    event({ type: "billed", at: ago(25), by: "Ravi K", sessionIds: ["S-1031"], tables: ["F"], title: "Bill generated · Table F", detail: "Session S-1031 moved to billing", amount: rupees(2257.5) }),
    event({ type: "created", at: ago(20), by: "Ravi K", sessionIds: ["S-1040"], tables: ["D"], title: "Session S-1040 started · Order #1 · Table D", detail: "4 items sent to kitchen", amount: rupees(860) }),
    event({ type: "created", at: ago(12), by: "Ravi K", sessionIds: ["S-1041"], tables: ["I"], title: "Session S-1041 started · Order #1 · Table I", detail: "3 items sent to kitchen", amount: rupees(470) }),
    event({ type: "paid", at: ago(4), by: "Ravi K", sessionIds: ["S-1029"], tables: ["E"], title: "Paid via Card · Table E", detail: "Session S-1029 closed · table released", amount: rupees(1365) }),
  ];

  return {
    version: 1,
    tables,
    sessions,
    activity,
    seq: { session: 1042, invoice: 2611457, event: ev, txn: 88213 },
  };
}
