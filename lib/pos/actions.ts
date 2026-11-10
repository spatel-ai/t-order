// Pure state transitions. Each takes the current PosData and returns a new one; nothing here touches storage.
import { formatINR } from "./money";
import { findMenuItem, mergeMenus, type MenuItem } from "./menu";
import type { RestaurantSettings } from "./settings";
import {
  activeSessionForTable,
  findSession,
  findTable,
  isActive,
  sessionBill,
  summarizeItems,
  tableStatus,
} from "./selectors";
import type {
  ActionCtx,
  ActivityEvent,
  Cart,
  DiningSession,
  OrderItem,
  PaymentMethod,
  PaymentPart,
  PosData,
  TableId,
} from "./types";

export class PosError extends Error {}

function clone(data: PosData): PosData {
  return structuredClone(data);
}

function pushEvent(data: PosData, ev: Omit<ActivityEvent, "id">) {
  data.activity.push({ id: `ev-${data.seq.event++}`, ...ev });
}

function itemsFromCart(menu: MenuItem[], cart: Cart, entryId: string): OrderItem[] {
  const items = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([menuId, qty], i) => {
      const m = findMenuItem(menu, menuId);
      if (!m) throw new PosError("An item in this order is no longer on the menu. Remove it and try again.");
      return { lineId: `${entryId}-L${i + 1}`, menuId, name: m.name, price: m.price, qty };
    });
  if (!items.length) throw new PosError("Add at least one item first.");
  return items;
}

function requireActive(data: PosData, sessionId: string): DiningSession {
  const s = findSession(data, sessionId);
  if (!s || !isActive(s)) throw new PosError(`Session ${sessionId} is not open.`);
  return s;
}

const entryTotal = (items: OrderItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0);

export function startSession(
  prev: PosData,
  tableId: TableId,
  cart: Cart,
  ctx: ActionCtx,
  guests = 2,
): { data: PosData; sessionId: string } {
  const data = clone(prev);
  const table = findTable(data, tableId);
  if (!table) throw new PosError(`Unknown table ${tableId}.`);
  if (activeSessionForTable(data, tableId)) throw new PosError(`Table ${tableId} already has an open session.`);

  const id = `S-${data.seq.session++}`;
  const entryId = `${id}-E1`;
  const items = itemsFromCart(data.menu, cart, entryId);
  data.sessions.push({
    id,
    tableId,
    status: "open",
    guests,
    startedAt: ctx.now,
    tableHistory: [tableId],
    entries: [{ id: entryId, no: 1, sentAt: ctx.now, by: ctx.staff.name, items }],
    discount: 0,
  });
  delete table.reservation;
  const total = entryTotal(items);
  pushEvent(data, {
    type: "created",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [id],
    tables: [tableId],
    title: `Session ${id} started · Order #1 · Table ${tableId}`,
    detail: `${summarizeItems(items)} — by ${ctx.staff.name}`,
    amount: total,
  });
  return { data, sessionId: id };
}

/** Appends a new order entry. Earlier entries are never modified. */
export function addEntry(prev: PosData, sessionId: string, cart: Cart, ctx: ActionCtx): PosData {
  const data = clone(prev);
  const s = requireActive(data, sessionId);
  const before = sessionBill(s).subtotal;
  const no = s.entries.length + 1;
  const entryId = `${s.id}-E${no}`;
  const items = itemsFromCart(data.menu, cart, entryId);
  s.entries.push({ id: entryId, no, sentAt: ctx.now, by: ctx.staff.name, items });
  s.status = "open"; // adding items after a bill was printed re-opens the bill
  const after = sessionBill(s).subtotal;
  pushEvent(data, {
    type: "added",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [s.id],
    tables: [s.tableId],
    title: `Order #${no} added · Table ${s.tableId}`,
    detail: `${summarizeItems(items)} — running bill ${formatINR(before)} → ${formatINR(after)}`,
    amount: after - before,
  });
  return data;
}

export function cancelItem(prev: PosData, sessionId: string, lineId: string, ctx: ActionCtx): PosData {
  const data = clone(prev);
  const s = requireActive(data, sessionId);
  const entry = s.entries.find((e) => e.items.some((i) => i.lineId === lineId));
  const item = entry?.items.find((i) => i.lineId === lineId);
  if (!entry || !item) throw new PosError("Item not found.");
  if (item.cancelled) throw new PosError("Item is already cancelled.");
  item.cancelled = true;
  pushEvent(data, {
    type: "cancelled",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [s.id],
    tables: [s.tableId],
    title: `Item cancelled · ${item.name}${item.qty > 1 ? ` ×${item.qty}` : ""}`,
    detail: `Order #${entry.no} · Table ${s.tableId} · by ${ctx.staff.name}`,
    amount: -item.price * item.qty,
  });
  return data;
}

/** Moves a session to an available table. Same session, same entries, same bill. */
export function transfer(prev: PosData, sessionId: string, to: TableId, ctx: ActionCtx): PosData {
  const data = clone(prev);
  const s = requireActive(data, sessionId);
  const dest = findTable(data, to);
  if (!dest) throw new PosError(`Unknown table ${to}.`);
  if (to === s.tableId) throw new PosError("Pick a different table.");
  if (tableStatus(data, dest) !== "available") throw new PosError(`Table ${to} is not available.`);
  const from = s.tableId;
  s.tableId = to;
  s.tableHistory.push(to);
  const bill = sessionBill(s);
  pushEvent(data, {
    type: "transferred",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [s.id],
    tables: [from, to],
    title: `Moved Table ${from} → Table ${to}`,
    detail: `Same session ${s.id} · ${s.entries.length} order ${s.entries.length === 1 ? "entry" : "entries"} · ${formatINR(bill.subtotal)} preserved`,
    amount: bill.subtotal,
  });
  return data;
}

/** Exchanges the tables of two occupied sessions. Bills are never merged. */
export function swap(prev: PosData, sessionA: string, sessionB: string, ctx: ActionCtx): PosData {
  const data = clone(prev);
  const a = requireActive(data, sessionA);
  const b = requireActive(data, sessionB);
  if (a.id === b.id) throw new PosError("Pick two different tables.");
  const [ta, tb] = [a.tableId, b.tableId];
  a.tableId = tb;
  b.tableId = ta;
  a.tableHistory.push(tb);
  b.tableHistory.push(ta);
  pushEvent(data, {
    type: "swapped",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [a.id, b.id],
    tables: [ta, tb],
    title: `Swapped Table ${ta} ↔ Table ${tb}`,
    detail: `${a.id} and ${b.id} exchanged tables · bills unchanged · by ${ctx.staff.name}`,
  });
  return data;
}

/**
 * "Swap table": the guest registered on one table now sits at another, so their bill follows them.
 * A free destination simply receives the bill; if another party is already there, the two bills trade tables.
 */
export function swapTable(prev: PosData, sessionId: string, to: TableId, ctx: ActionCtx): PosData {
  const other = activeSessionForTable(prev, to);
  return other && other.id !== sessionId ? swap(prev, sessionId, other.id, ctx) : transfer(prev, sessionId, to, ctx);
}

export function requestBill(prev: PosData, sessionId: string, ctx: ActionCtx): PosData {
  const current = findSession(prev, sessionId);
  if (current?.status === "billing") return prev;
  const data = clone(prev);
  const s = requireActive(data, sessionId);
  s.status = "billing";
  pushEvent(data, {
    type: "billed",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [s.id],
    tables: [s.tableId],
    title: `Bill generated · Table ${s.tableId}`,
    detail: `Session ${s.id} moved to billing`,
    amount: sessionBill(s).total,
  });
  return data;
}

export function setDiscount(prev: PosData, sessionId: string, discount: number): PosData {
  const data = clone(prev);
  const s = requireActive(data, sessionId);
  s.discount = Math.max(0, Math.round(discount));
  return data;
}

export interface CheckoutInput {
  method: PaymentMethod;
  tendered?: number;
  parts?: PaymentPart[];
}

/** Settles the session, closes it and releases its table. */
export function checkout(prev: PosData, sessionId: string, input: CheckoutInput, ctx: ActionCtx): PosData {
  const data = clone(prev);
  const s = requireActive(data, sessionId);
  const bill = sessionBill(s);
  if (bill.total <= 0) throw new PosError("Nothing to charge on this bill.");

  let tendered: number | undefined;
  let change: number | undefined;
  if (input.method === "Cash") {
    tendered = input.tendered ?? bill.total;
    if (tendered < bill.total) throw new PosError("Cash received is less than the bill.");
    change = tendered - bill.total;
  }
  if (input.method === "Split") {
    const sum = (input.parts ?? []).reduce((t, p) => t + p.amount, 0);
    if (sum !== bill.total) throw new PosError(`Split parts must add up to ${formatINR(bill.total)}.`);
  }
  const needsTxn = input.method === "UPI" || input.method === "Card" || input.parts?.some((p) => p.method !== "Cash");
  const txnId = needsTxn ? `${input.method === "Card" ? "CARD" : "UPI"}-${data.seq.txn++}` : undefined;
  const invoiceNo = `INV-${data.seq.invoice++}`;

  s.status = "paid";
  s.closedAt = ctx.now;
  s.payment = {
    method: input.method,
    amount: bill.total,
    tendered,
    change,
    txnId,
    parts: input.method === "Split" ? input.parts : undefined,
    invoiceNo,
    paidAt: ctx.now,
    by: ctx.staff.name,
  };
  pushEvent(data, {
    type: "paid",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [s.id],
    tables: [s.tableId],
    title: `Paid via ${input.method} · Table ${s.tableId}`,
    detail: `${formatINR(bill.taxable)} + GST ${formatINR(bill.tax)}${txnId ? ` · Txn ${txnId}` : ""} · ${invoiceNo}`,
    amount: bill.total,
  });
  pushEvent(data, {
    type: "released",
    at: ctx.now,
    by: ctx.staff.name,
    sessionIds: [s.id],
    tables: [s.tableId],
    title: `Table ${s.tableId} released`,
    detail: `Session ${s.id} closed · table set to Available`,
  });
  return data;
}

/** Bulk menu upload. "replace" swaps the whole menu; "merge" adds new items and updates matching ids. */
export function importMenu(prev: PosData, items: MenuItem[], mode: "replace" | "merge"): PosData {
  if (!items.length) throw new PosError("The upload has no valid menu items.");
  const data = clone(prev);
  data.menu = mode === "replace" ? items : mergeMenus(data.menu, items);
  return data;
}

export function updateSettings(prev: PosData, settings: RestaurantSettings): PosData {
  if (!settings.name.trim()) throw new PosError("Restaurant name is required.");
  const data = clone(prev);
  data.settings = settings;
  return data;
}
