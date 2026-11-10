# Vaishnavi Foods POS — Table ordering & dynamic billing

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

The system starts blank: tables 1–12, no menu, no orders, no activity. **Clear orders & activity** at the bottom of the dashboard erases all orders and payments again (the menu and settings are kept).

## Setting up the restaurant

1. **Settings** (gear icon): restaurant name, address, phone, GSTIN, **UPI ID**, paper width (80 mm / 58 mm) and the bill footer. The name defaults to "Vaishnavi Foods"; everything else starts empty.
2. **Menu → Upload menu JSON**: upload every dish in one file. A preview lists valid items and any skipped rows before anything changes; choose *Replace the entire menu* or *Add to the current menu*. *Export* downloads the current menu in the same format.

```json
{ "items": [
  { "name": "Masala Dosa", "price": 90, "category": "South Indian", "diet": "veg", "portion": "1 pc", "code": "MD" },
  { "name": "Filter Coffee", "price": 30 }
] }
```

`name` and `price` (rupees) are required. `category` defaults to "Other", `diet` (`veg` / `nonveg`, or `"veg": true/false`) to veg. Open tables keep the names and prices they were ordered at.

## Thermal printing and the payment QR

- **Checkout → Print bill** prints the bill for the guest with a **UPI scan-to-pay QR** carrying the exact amount due (for a split payment, the UPI part). The same QR is shown on screen for UPI and Split.
- **Receipt → Print receipt** prints the paid tax invoice.
- The QR is a standard `upi://pay` link, so GPay, PhonePe, Paytm and any other UPI app open with the payee and amount filled in. No QR is shown until a UPI ID is saved in Settings.
- Printing uses the browser's print dialog, so it works with any thermal printer installed on the computer (USB, network or Bluetooth). The bill is one black-and-white column, 72 mm wide on an 80 mm roll or 48 mm on a 58 mm roll. In the print dialog pick the receipt printer, set margins to *None* and switch off headers and footers. For printing with no dialog, start Chrome with `--kiosk-printing`.
- The POS does not know whether a UPI payment arrived: the cashier confirms it after checking the bank or UPI app.

## What's where

| Path | Purpose |
| --- | --- |
| `lib/pos/types.ts` | Domain model: Table, DiningSession, OrderEntry, Payment, ActivityEvent |
| `lib/pos/actions.ts` | Pure state transitions: `startSession`, `addEntry`, `cancelItem`, `swapTable` (uses `transfer` / `swap`), `requestBill`, `setDiscount`, `checkout` |
| `lib/pos/selectors.ts` | Derived values: running bill, table status, dashboard stats |
| `lib/pos/money.ts` | Integer-paise money maths, GST 5% (CGST 2.5% + SGST 2.5%), INR formatting |
| `lib/pos/store.ts` | localStorage / sessionStorage persistence via `useSyncExternalStore` |
| `lib/pos/drafts.ts` | Tab-scoped cart and "add items" drafts |
| `lib/pos/seed.ts` | The blank starting state (tables 1–12) |
| `lib/pos/menu.ts` | Menu JSON parsing / merge / export |
| `lib/pos/settings.ts` | Restaurant settings, UPI link builder, UPI ID and GSTIN validation |
| `components/pos/ThermalBill.tsx` | The printed bill / tax invoice and the print portal |
| `components/pos/*` | One component per Figma component (TableCard, StatusBadge, MenuItemCard, OrderItemRow, QuantityStepper, SearchInput, FilterControl, BillingSummary, PaymentSelector, ConfirmDialog, Toast, OrderHistoryItem, AppHeader) |
| `app/globals.css` | Figma design tokens as Tailwind v4 theme variables and type-ramp utilities |

## Business rules

- **Table** is only a place. **Dining session** is the visit; it owns the order entries.
- **Order entries** are appended (Order #1, #2, …). Earlier entries are never edited; individual items can be cancelled and are then excluded from the bill.
- **Running bill** is always derived from the session's entries — it is never stored, so it can't drift.
- **Table status** is derived: open session → Occupied; bill generated (checkout opened) → Billing; reservation → Reserved; otherwise Available.
- **Swap table**: the guest registered on one table has moved to another, so the bill follows them. Pick the table the bill is on, then the table the guest now sits at. A free table simply receives the bill (same session, same entries, same total; the old table becomes Available). If the new table is occupied, the two bills trade tables. Bills are never merged. No PIN is needed.
- **Checkout** records the payment (Cash with change, UPI, Card, or Split), closes the session and releases the table.
- Every change is written to the activity log.

## Storage

| Key | Storage | Contents |
| --- | --- | --- |
| `pos:v2:data` | localStorage | Tables, sessions, payments, activity log, ID sequences, menu and restaurant settings (both survive **Clear orders & activity**). Shared by every tab and kept in sync across tabs via the `storage` event. |
| `pos:session:carts` | sessionStorage | New-order cart drafts per table ("Save Draft") |
| `pos:session:additions` | sessionStorage | Pending "Add Items" drafts per session |
| `pos:session:staff:v2` | sessionStorage | Signed-in staff (click the avatar to switch Cashier ↔ Manager — demo only) |
| `pos:session:toast`, `…Filter`, `…Query` | sessionStorage | Last notification, filters, dashboard search |

Drafts are per tab on purpose: two waiters on two tabs don't overwrite each other's unsent carts. Confirmed orders go to localStorage and show up everywhere.


## Test flows

The app starts blank, so upload a menu first (Menu → Upload menu JSON). Then:

| Flow | Steps | Expected |
| --- | --- | --- |
| A | Table 1 → add dishes → Send to Kitchen | Table 1 Occupied, session S-1, running bill shown |
| B | Add Items → more dishes → Confirm Additions | Same session, Order #2, bill increases |
| C | Swap table → Table 1 → Table 2 → Move bill | Table 1 Available, Table 2 Occupied with the same bill |
| D | Table 2 → Checkout → Print bill / UPI → Confirm received | Receipt INV-1 (Table 2 from 1), Table 2 Available |
| E | Swap table → pick an occupied table as the new table → Swap tables | The two bills trade tables, each unchanged |

`npm test` covers these at the domain level using the busy-floor fixture in `lib/pos/fixtures.ts`.

## Responsive behaviour

- **≥1024px:** split view with a sticky order panel (340px, growing to 440px on wider screens); the running total stays pinned. The menu shows a category rail on the left that stays put while dishes scroll.
- **<1024px (tablet / phone):** the panel collapses into a sticky bottom bar (total + primary action) that opens a drawer. Categories become one row of pills that scrolls sideways.
- **Dish tiles** are a fixed compact size (min 140px) and the grid fits as many per row as the screen allows: 2 on a phone, 4 at 1200px, more on larger monitors. Nothing stretches on ultra-wide screens and nothing forces the page wider than the window.

Touch targets are at least 40px.
# t-order
