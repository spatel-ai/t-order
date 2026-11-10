// The system starts blank: twelve empty tables, no menu, no orders, no activity.
// Data appears only after a menu is uploaded and orders are taken.
import { DEFAULT_SETTINGS } from "./settings";
import { TABLE_IDS, type PosData, type TableId } from "./types";

const SEATS: Record<TableId, number> = { 1: 4, 2: 4, 3: 4, 4: 2, 5: 2, 6: 6, 7: 6, 8: 4, 9: 2, 10: 4, 11: 8, 12: 6 };

export function createSeed(): PosData {
  return {
    version: 1,
    tables: TABLE_IDS.map((id) => ({ id, seats: SEATS[id] })),
    sessions: [],
    activity: [],
    seq: { session: 1, invoice: 1, event: 1, txn: 1 },
    menu: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
