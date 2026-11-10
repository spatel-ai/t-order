import { describe, expect, it } from "vitest";
import { addEntry, importMenu, PosError, startSession, updateSettings } from "./actions";
import { mergeMenus, menuToJson, parseMenuJson } from "./menu";
import { createDemoData as createSeed } from "./fixtures";
import { cartBill, cartLines, pruneCart, sessionBill, findSession } from "./selectors";
import { DEFAULT_SETTINGS, isValidGstin, isValidUpiId, upiPayUri } from "./settings";
import type { ActionCtx } from "./types";

const ctx: ActionCtx = { now: "2026-11-11T14:12:00.000Z", staff: { name: "Anantram Patel", role: "Cashier" } };

describe("menu JSON upload", () => {
  it("parses an items array, converting rupees to paise and filling defaults", () => {
    const { items, errors } = parseMenuJson(
      JSON.stringify({
        items: [
          { name: "Masala Dosa", price: 90, category: "South Indian", diet: "veg", portion: "1 pc", code: "md" },
          { name: " Filter Coffee ", price: "₹30.50" },
          { name: "Egg Curry", price: 140, veg: false },
        ],
      }),
    );
    expect(errors).toEqual([]);
    expect(items).toEqual([
      { id: "masala-dosa", code: "MD", name: "Masala Dosa", category: "South Indian", price: 9000, diet: "veg", portion: "1 pc" },
      { id: "filter-coffee", code: "FC", name: "Filter Coffee", category: "Other", price: 3050, diet: "veg", portion: "" },
      { id: "egg-curry", code: "EC", name: "Egg Curry", category: "Other", price: 14000, diet: "nonveg", portion: "" },
    ]);
  });

  it("accepts a bare array and non-Latin names", () => {
    const { items, errors } = parseMenuJson('[{"name":"मसाला डोसा","price":90}]');
    expect(errors).toEqual([]);
    expect(items[0].id).toBe("मस-ल-ड-स");
  });

  it("skips bad rows and explains each one", () => {
    const { items, errors } = parseMenuJson(
      JSON.stringify([{ name: "Idli", price: 40 }, { price: 10 }, { name: "Vada", price: -5 }, { name: "Idli", price: 45 }, { name: "Poha", price: 30, diet: "fish" }, "x"]),
    );
    expect(items.map((i) => i.name)).toEqual(["Idli"]);
    expect(errors).toHaveLength(5);
    expect(errors[0]).toMatch(/Item 2.*name/);
    expect(errors[2]).toMatch(/duplicate/);
  });

  it("rejects files that are not a menu", () => {
    expect(parseMenuJson("not json").errors[0]).toMatch(/not valid JSON/);
    expect(parseMenuJson('{"foo":1}').errors[0]).toMatch(/Expected a JSON array/);
    expect(parseMenuJson("[]").errors[0]).toMatch(/no menu items/);
  });

  it("round-trips through export", () => {
    const menu = createSeed().menu;
    expect(parseMenuJson(menuToJson(menu))).toEqual({ items: menu, errors: [] });
  });

  it("merge updates matching ids and appends new items", () => {
    const menu = createSeed().menu;
    const merged = mergeMenus(menu, parseMenuJson('[{"name":"Butter Naan","price":55},{"name":"Lassi","price":70}]').items);
    expect(merged).toHaveLength(menu.length + 1);
    expect(merged.find((m) => m.id === "butter-naan")!.price).toBe(5500);
    expect(merged.at(-1)!.id).toBe("lassi");
  });
});

describe("replacing the menu while tables are open", () => {
  const newMenu = parseMenuJson('[{"name":"Masala Dosa","price":90},{"name":"Butter Naan","price":75}]').items;

  it("keeps existing bills at the prices they were ordered at", () => {
    const { data, sessionId } = startSession(createSeed(), "1", { "butter-naan": 2 }, ctx);
    const after = importMenu(data, newMenu, "replace");
    expect(after.menu).toEqual(newMenu);
    expect(sessionBill(findSession(after, sessionId)!).subtotal).toBe(10000);
    // new entries use the new price
    const added = addEntry(after, sessionId, { "butter-naan": 1, "masala-dosa": 1 }, ctx);
    expect(sessionBill(findSession(added, sessionId)!).subtotal).toBe(10000 + 7500 + 9000);
  });

  it("drops removed dishes from drafts instead of crashing", () => {
    const cart = { "paneer-tikka": 2, "masala-dosa": 1 };
    expect(cartLines(cart, newMenu)).toHaveLength(1);
    expect(cartBill(cart, newMenu).subtotal).toBe(9000);
    expect(pruneCart(cart, newMenu)).toEqual({ "masala-dosa": 1 });
    const data = importMenu(createSeed(), newMenu, "replace");
    expect(() => startSession(data, "1", cart, ctx)).toThrow(PosError);
  });

  it("refuses an empty upload", () => {
    expect(() => importMenu(createSeed(), [], "replace")).toThrow(PosError);
  });
});

describe("settings and UPI QR", () => {
  it("defaults to Vaishnavi Foods with no UPI ID, so no QR is produced", () => {
    const d = createSeed();
    expect(d.settings.name).toBe("Vaishnavi Foods");
    expect(upiPayUri(d.settings, 68250, "Table 2")).toBeNull();
  });

  it("builds a UPI deep link with the exact amount", () => {
    const s = { ...DEFAULT_SETTINGS, upiId: "vaishnavi.foods@okhdfcbank" };
    expect(upiPayUri(s, 68250, "Table 2 ORD-1042")).toBe(
      "upi://pay?pa=vaishnavi.foods%40okhdfcbank&pn=Vaishnavi%20Foods&am=682.50&cu=INR&tn=Table%202%20ORD-1042",
    );
    expect(upiPayUri({ ...s, upiPayeeName: "V Foods & Co" }, 100, "x")).toContain("pn=V%20Foods%20%26%20Co");
    expect(upiPayUri(s, 0, "x")).toBeNull();
  });

  it("validates UPI IDs and GSTINs", () => {
    expect(isValidUpiId("9876543210@ybl")).toBe(true);
    expect(isValidUpiId("no-at-sign")).toBe(false);
    expect(isValidUpiId("a b@ybl")).toBe(false);
    expect(isValidGstin("29ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("29ABCDE1234F1")).toBe(false);
  });

  it("requires a restaurant name", () => {
    expect(() => updateSettings(createSeed(), { ...DEFAULT_SETTINGS, name: " " })).toThrow(PosError);
    expect(updateSettings(createSeed(), { ...DEFAULT_SETTINGS, name: "VF" }).settings.name).toBe("VF");
  });
});

describe("a fresh install", () => {
  it("starts blank: twelve numbered empty tables, no menu, no orders, no activity", async () => {
    const { createSeed: blank } = await import("./seed");
    const d = blank();
    expect(d.tables.map((t) => t.id)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    expect(d.tables.every((t) => !t.reservation)).toBe(true);
    expect([d.sessions, d.activity, d.menu]).toEqual([[], [], []]);
    expect(() => startSession(d, "1", { "masala-dosa": 1 }, ctx)).toThrow(PosError);
    const withMenu = importMenu(d, parseMenuJson('[{"name":"Masala Dosa","price":90}]').items, "replace");
    const { data, sessionId } = startSession(withMenu, "1", { "masala-dosa": 2 }, ctx);
    expect(sessionId).toBe("S-1");
    expect(data.activity).toHaveLength(1);
    expect(data.activity[0].by).toBe("Anantram Patel");
  });
});
