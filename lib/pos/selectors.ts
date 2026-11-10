import { computeBill, type Bill } from "./money";
import type { Cart, DiningSession, OrderItem, PosData, Table, TableId, TableStatus } from "./types";
import { findMenuItem, type MenuItem } from "./menu";

export const isActive = (s: DiningSession) => s.status !== "paid";

export function sessionItems(s: DiningSession): OrderItem[] {
  return s.entries.flatMap((e) => e.items);
}

export function sessionBill(s: DiningSession): Bill {
  return computeBill(sessionItems(s), s.discount);
}

export function activeSessionForTable(data: PosData, tableId: TableId): DiningSession | undefined {
  return data.sessions.find((s) => s.tableId === tableId && isActive(s));
}

export function findSession(data: PosData, sessionId: string): DiningSession | undefined {
  return data.sessions.find((s) => s.id === sessionId);
}

export function findTable(data: PosData, tableId: string): Table | undefined {
  return data.tables.find((t) => t.id === tableId);
}

export function tableStatus(data: PosData, table: Table): TableStatus {
  const s = activeSessionForTable(data, table.id);
  if (s) return s.status === "billing" ? "billing" : "occupied";
  return table.reservation ? "reserved" : "available";
}

/** Tables a session may be transferred to: no active session and no reservation. */
export function availableTables(data: PosData): Table[] {
  return data.tables.filter((t) => tableStatus(data, t) === "available");
}

export function statusCounts(data: PosData): Record<TableStatus | "all", number> {
  const counts = { all: data.tables.length, available: 0, occupied: 0, billing: 0, reserved: 0 };
  for (const t of data.tables) counts[tableStatus(data, t)]++;
  return counts;
}

/** Header stats. Open sales = pre-tax subtotal of all open sessions. */
export function dashboardStats(data: PosData) {
  const active = data.sessions.filter(isActive);
  return {
    activeTables: active.length,
    totalTables: data.tables.length,
    openSales: active.reduce((sum, s) => sum + sessionBill(s).subtotal, 0),
  };
}

/** Draft lines for a cart. Items that have since been removed from the menu are dropped. */
export function cartLines(cart: Cart, menu: MenuItem[]) {
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .flatMap(([id, qty]) => {
      const item = findMenuItem(menu, id);
      return item ? [{ item, qty }] : [];
    });
}

export function cartBill(cart: Cart, menu: MenuItem[]): Bill {
  return computeBill(cartLines(cart, menu).map(({ item, qty }) => ({ price: item.price, qty })));
}

/** The cart without entries whose menu item no longer exists. */
export function pruneCart(cart: Cart, menu: MenuItem[]): Cart {
  return Object.fromEntries(cartLines(cart, menu).map(({ item, qty }) => [item.id, qty]));
}

export function summarizeItems(items: { name: string; qty: number }[]) {
  return items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(", ");
}

/** Display order number derived from the session id, e.g. S-1042 → ORD-1042. */
export const orderIdFor = (sessionId: string) => sessionId.replace(/^S-/, "ORD-");
