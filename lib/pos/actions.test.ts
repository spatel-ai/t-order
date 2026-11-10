import { describe, expect, it } from "vitest";
import { addEntry, cancelItem, checkout, PosError, startSession, swap, swapTable, transfer } from "./actions";
import { formatINR } from "./money";
import { createDemoData as createSeed } from "./fixtures";
import { activeSessionForTable, dashboardStats, findSession, findTable, sessionBill, statusCounts, tableStatus } from "./selectors";
import type { ActionCtx, PosData, TableId } from "./types";

const cashier: ActionCtx = { now: "2026-11-11T14:12:00.000Z", staff: { name: "Anantram Patel", role: "Cashier" } };
const manager: ActionCtx = { now: "2026-11-11T15:01:00.000Z", staff: { name: "Anita S", role: "Manager" } };

const status = (d: PosData, id: TableId) => tableStatus(d, findTable(d, id)!);

function flowA() {
  const seed = createSeed(new Date("2026-11-11T14:00:00.000Z"));
  return startSession(seed, "1", { "paneer-butter-masala": 1, "butter-naan": 2, "veg-biryani": 1 }, cashier, 4);
}

function flowB() {
  const { data, sessionId } = flowA();
  return { data: addEntry(data, sessionId, { "water-bottle": 2, "gulab-jamun": 1 }, cashier), sessionId };
}

describe("seed", () => {
  it("matches the Figma dashboard", () => {
    const d = createSeed();
    expect(d.tables).toHaveLength(12);
    expect(statusCounts(d)).toEqual({ all: 12, available: 6, occupied: 3, billing: 1, reserved: 2 });
    expect(dashboardStats(d)).toMatchObject({ activeTables: 4, openSales: 472000 });
    expect(sessionBill(activeSessionForTable(d, "3")!)).toMatchObject({ subtotal: 124000, itemCount: 7 });
    expect(sessionBill(activeSessionForTable(d, "4")!)).toMatchObject({ subtotal: 86000, itemCount: 4 });
    expect(sessionBill(activeSessionForTable(d, "6")!)).toMatchObject({ subtotal: 215000, itemCount: 11 });
    expect(sessionBill(activeSessionForTable(d, "9")!)).toMatchObject({ subtotal: 47000, itemCount: 3 });
  });
});

describe("Test Flow A — start order", () => {
  it("creates session S-1042 on Table 1 with a ₹530 running total", () => {
    const { data, sessionId } = flowA();
    expect(sessionId).toBe("S-1042");
    expect(status(data, "1")).toBe("occupied");
    const bill = sessionBill(findSession(data, sessionId)!);
    expect(formatINR(bill.subtotal)).toBe("₹530");
    expect(bill.itemCount).toBe(4);
  });

  it("refuses a second session on an occupied table", () => {
    const { data } = flowA();
    expect(() => startSession(data, "1", { "water-bottle": 1 }, cashier)).toThrow(PosError);
  });
});

describe("Test Flow B — add more items", () => {
  it("appends Order #2 to the same session and updates the total to ₹650", () => {
    const { data, sessionId } = flowB();
    const s = findSession(data, sessionId)!;
    expect(data.sessions.filter((x) => x.tableId === "1" && x.status !== "paid")).toHaveLength(1);
    expect(s.entries.map((e) => e.no)).toEqual([1, 2]);
    expect(s.entries[0].items.map((i) => [i.name, i.qty])).toEqual([
      ["Paneer Butter Masala", 1],
      ["Butter Naan", 2],
      ["Veg Biryani", 1],
    ]);
    expect(formatINR(sessionBill(s).subtotal)).toBe("₹650");
  });

  it("excludes cancelled items from the bill", () => {
    const { data, sessionId } = flowB();
    const water = findSession(data, sessionId)!.entries[1].items[0];
    const after = cancelItem(data, sessionId, water.lineId, cashier);
    expect(formatINR(sessionBill(findSession(after, sessionId)!).subtotal)).toBe("₹610");
  });
});

describe("Test Flow C — transfer table", () => {
  it("moves the session A → B, keeping all entries and ₹650", () => {
    const { data, sessionId } = flowB();
    const after = transfer(data, sessionId, "2", cashier);
    expect(status(after, "1")).toBe("available");
    expect(status(after, "2")).toBe("occupied");
    const s = activeSessionForTable(after, "2")!;
    expect(s.id).toBe(sessionId);
    expect(s.entries).toHaveLength(2);
    expect(formatINR(sessionBill(s).subtotal)).toBe("₹650");
    expect(s.tableHistory).toEqual(["1", "2"]);
  });

  it("only allows available destinations", () => {
    const { data, sessionId } = flowB();
    expect(() => transfer(data, sessionId, "3", cashier)).toThrow(/not available/);
    expect(() => transfer(data, sessionId, "8", cashier)).toThrow(/not available/); // reserved
  });
});

describe("Test Flow D — checkout via UPI", () => {
  it("charges ₹682.50 incl. GST, closes the session and releases Table 2", () => {
    const { data, sessionId } = flowB();
    const moved = transfer(data, sessionId, "2", cashier);
    const bill = sessionBill(findSession(moved, sessionId)!);
    expect([bill.cgst, bill.sgst, bill.total]).toEqual([1625, 1625, 68250]);
    const paid = checkout(moved, sessionId, { method: "UPI" }, cashier);
    const s = findSession(paid, sessionId)!;
    expect(s.status).toBe("paid");
    expect(s.payment).toMatchObject({ method: "UPI", amount: 68250, txnId: "UPI-88213" });
    expect(status(paid, "2")).toBe("available");
    expect(paid.activity.slice(-2).map((e) => e.type)).toEqual(["paid", "released"]);
  });

  it("validates cash tendered and split totals", () => {
    const { data, sessionId } = flowB();
    expect(() => checkout(data, sessionId, { method: "Cash", tendered: 50000 }, cashier)).toThrow(/less than/);
    const cash = checkout(data, sessionId, { method: "Cash", tendered: 70000 }, cashier);
    expect(findSession(cash, sessionId)!.payment!.change).toBe(1750);
    expect(() =>
      checkout(data, sessionId, { method: "Split", parts: [{ method: "Cash", amount: 30000 }, { method: "UPI", amount: 30000 }] }, cashier),
    ).toThrow(/add up/);
  });
});

describe("Test Flow E — swap occupied tables", () => {
  it("exchanges C and D without altering either session", () => {
    const seed = createSeed();
    const c = activeSessionForTable(seed, "3")!;
    const d = activeSessionForTable(seed, "4")!;
    const after = swap(seed, c.id, d.id, manager);
    const newC = activeSessionForTable(after, "3")!;
    const newD = activeSessionForTable(after, "4")!;
    expect(newC.id).toBe("S-1040");
    expect(newD.id).toBe("S-1038");
    expect(sessionBill(newC).subtotal).toBe(sessionBill(d).subtotal);
    expect(sessionBill(newD).subtotal).toBe(sessionBill(c).subtotal);
    expect(newC.entries).toEqual(d.entries);
    expect(after.sessions).toHaveLength(seed.sessions.length);
  });

  it("swapTable moves the bill to a free table, or trades bills with an occupied one", () => {
    const seed = createSeed();
    const moved = swapTable(seed, "S-1038", "1", cashier); // table 3 → free table 1
    expect(activeSessionForTable(moved, "1")!.id).toBe("S-1038");
    expect(status(moved, "3")).toBe("available");
    expect(sessionBill(activeSessionForTable(moved, "1")!).subtotal).toBe(124000);
    expect(findSession(moved, "S-1038")!.tableHistory).toEqual(["3", "1"]);
    const traded = swapTable(seed, "S-1038", "4", cashier); // table 3 ↔ occupied table 4
    expect(activeSessionForTable(traded, "4")!.id).toBe("S-1038");
    expect(activeSessionForTable(traded, "3")!.id).toBe("S-1040");
    expect(() => swapTable(seed, "S-1038", "3", cashier)).toThrow(PosError); // same table
    expect(() => swapTable(seed, "S-1038", "8", cashier)).toThrow(PosError); // reserved
  });
});

it("never mutates the previous state", () => {
  const seed = createSeed();
  const snapshot = JSON.stringify(seed);
  startSession(seed, "1", { "water-bottle": 1 }, cashier);
  expect(JSON.stringify(seed)).toBe(snapshot);
});
