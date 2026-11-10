# Spice Route POS — Table ordering & dynamic billing

A frontend-only Next.js implementation of the Restaurant POS designed in Figma
(`wkR7N4AiDQmjTlqLGrxwhy`). There is no backend: all data lives in the browser's
`localStorage` and `sessionStorage`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # domain tests for test flows A–E
npm run lint && npm run typecheck && npm run build
```

Use **Reset demo data** at the bottom of the dashboard to restore the starting floor.

## What's where

| Path | Purpose |
| --- | --- |
| `lib/pos/types.ts` | Domain model: Table, DiningSession, OrderEntry, Payment, ActivityEvent |
| `lib/pos/actions.ts` | Pure state transitions: `startSession`, `addEntry`, `cancelItem`, `transfer`, `swap`, `requestBill`, `setDiscount`, `checkout` |
| `lib/pos/selectors.ts` | Derived values: running bill, table status, dashboard stats |
| `lib/pos/money.ts` | Integer-paise money maths, GST 5% (CGST 2.5% + SGST 2.5%), INR formatting |
| `lib/pos/store.ts` | localStorage / sessionStorage persistence via `useSyncExternalStore` |
| `lib/pos/drafts.ts` | Tab-scoped cart and "add items" drafts |
| `lib/pos/seed.ts` | Demo floor matching the Figma file |
| `components/pos/*` | One component per Figma component (TableCard, StatusBadge, MenuItemCard, OrderItemRow, QuantityStepper, SearchInput, FilterControl, BillingSummary, PaymentSelector, ConfirmDialog, TransferModal, Toast, OrderHistoryItem, AppHeader) |
| `app/globals.css` | Figma design tokens as Tailwind v4 theme variables and type-ramp utilities |

## Business rules

- **Table** is only a place. **Dining session** is the visit; it owns the order entries.
- **Order entries** are appended (Order #1, #2, …). Earlier entries are never edited; individual items can be cancelled and are then excluded from the bill.
- **Running bill** is always derived from the session's entries — it is never stored, so it can't drift.
- **Table status** is derived: open session → Occupied; bill generated (checkout opened) → Billing; reservation → Reserved; otherwise Available.
- **Transfer** moves a session to an *available* table. Same session ID, same entries, same total; the source table becomes Available.
- **Swap** (manager only) exchanges the tables of two occupied sessions. Bills are never merged.
- **Checkout** records the payment (Cash with change, UPI, Card, or Split), closes the session and releases the table.
- Every change is written to the activity log.

## Storage

| Key | Storage | Contents |
| --- | --- | --- |
| `pos:v1:data` | localStorage | Tables, sessions, payments, activity log, ID sequences. Shared by every tab and kept in sync across tabs via the `storage` event. |
| `pos:session:carts` | sessionStorage | New-order cart drafts per table ("Save Draft") |
| `pos:session:additions` | sessionStorage | Pending "Add Items" drafts per session |
| `pos:session:staff` | sessionStorage | Signed-in staff (click the avatar to switch Cashier ↔ Manager — demo only) |
| `pos:session:toast`, `…Filter`, `…Query` | sessionStorage | Last notification, filters, dashboard search |

Drafts are per tab on purpose: two waiters on two tabs don't overwrite each other's unsent carts. Confirmed orders go to localStorage and show up everywhere.

The swap screen's manager PIN (`1234`) is a demo placeholder. A frontend-only app cannot keep a secret, so real deployments need server-side authorisation.

## Test flows

| Flow | Steps | Expected |
| --- | --- | --- |
| A | Table A → add Paneer Butter Masala, Butter Naan ×2, Veg Biryani → Send to Kitchen | Running bill ₹530, session S-1042 |
| B | Add Items → Water Bottle ×2, Gulab Jamun → Confirm Additions | Same session, Order #2, ₹650 |
| C | Transfer → Table B → Confirm Transfer | A Available, B Occupied ₹650 |
| D | Table B → Checkout → UPI → Confirm ₹682.50 received | Receipt (S-1042, Table B from A, UPI txn), B Available |
| E | Swap → C and D → PIN 1234 → Confirm Swap | C shows S-1040 ₹860, D shows S-1038 ₹1,240 |

`npm test` covers these at the domain level.

## Responsive behaviour

- **≥1280px:** split view with a sticky order/cart panel; the running total stays pinned.
- **1024px (tablet):** the panel collapses into a sticky bottom bar (total + primary action) that opens a drawer.
- **390px (mobile):** 2-column table grid, single-column screens and the same bottom bar.

Touch targets are at least 44px.
