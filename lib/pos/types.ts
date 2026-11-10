import type { MenuItem } from "./menu";
import type { RestaurantSettings } from "./settings";

export const TABLE_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export type TableId = (typeof TABLE_IDS)[number];

export type TableStatus = "available" | "occupied" | "billing" | "reserved";

export interface Reservation {
  name: string;
  time: string; // display time, e.g. "8:30 PM"
  guests: number;
}

/** The physical seating location. Holds no order data. */
export interface Table {
  id: TableId;
  seats: number;
  reservation?: Reservation;
}

export interface OrderItem {
  lineId: string;
  menuId: string;
  name: string;
  /** unit price in paise, captured at order time */
  price: number;
  qty: number;
  cancelled?: boolean;
}

/** One batch of items sent to the kitchen. Never edited after sending (except cancellations). */
export interface OrderEntry {
  id: string;
  no: number;
  sentAt: string;
  by: string;
  items: OrderItem[];
}

export type PaymentMethod = "Cash" | "UPI" | "Card" | "Split";

export interface PaymentPart {
  method: Exclude<PaymentMethod, "Split">;
  amount: number;
}

export interface Payment {
  method: PaymentMethod;
  amount: number;
  tendered?: number;
  change?: number;
  txnId?: string;
  parts?: PaymentPart[];
  invoiceNo: string;
  paidAt: string;
  by: string;
}

/** The customer visit. Moves between tables on transfer/swap; the running bill is derived from its entries. */
export interface DiningSession {
  id: string;
  tableId: TableId;
  status: "open" | "billing" | "paid";
  guests: number;
  startedAt: string;
  closedAt?: string;
  /** every table this session has occupied, in order */
  tableHistory: TableId[];
  entries: OrderEntry[];
  /** paise */
  discount: number;
  payment?: Payment;
}

export type ActivityType = "created" | "added" | "cancelled" | "transferred" | "swapped" | "billed" | "paid" | "released";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  at: string;
  by: string;
  sessionIds: string[];
  tables: TableId[];
  title: string;
  detail: string;
  /** signed paise, omitted when not money-related */
  amount?: number;
}

export interface PosData {
  version: 1;
  tables: Table[];
  sessions: DiningSession[];
  activity: ActivityEvent[];
  seq: { session: number; invoice: number; event: number; txn: number };
  /** The live menu. Order items copy name and price at order time, so menu edits never change past bills. */
  menu: MenuItem[];
  settings: RestaurantSettings;
}

export interface Staff {
  name: string;
  role: "Cashier" | "Manager";
}

export interface ActionCtx {
  now: string;
  staff: Staff;
}

/** menuId → qty */
export type Cart = Record<string, number>;
