"use client";
// Tab-scoped drafts (sessionStorage): new-order carts per table, and pending additions per session.
import { useCallback } from "react";
import { useSessionState } from "./store";
import type { Cart } from "./types";

export interface CartDraft {
  items: Cart;
  guests: number;
}

const EMPTY: Record<string, CartDraft> = {};

export function useCartDrafts() {
  return useSessionState<Record<string, CartDraft>>("carts", EMPTY);
}

export function useCartDraft(tableId: string) {
  const [drafts, setDrafts] = useCartDrafts();
  const draft = drafts[tableId] ?? { items: {}, guests: 2 };
  const update = useCallback(
    (fn: (d: CartDraft) => CartDraft) =>
      setDrafts((all) => ({ ...all, [tableId]: fn(all[tableId] ?? { items: {}, guests: 2 }) })),
    [setDrafts, tableId],
  );
  const clear = useCallback(
    () =>
      setDrafts((all) => {
        const next = { ...all };
        delete next[tableId];
        return next;
      }),
    [setDrafts, tableId],
  );
  return { draft, update, clear };
}

export function useAdditionDraft(sessionId: string) {
  const [all, setAll] = useSessionState<Record<string, Cart>>("additions", {});
  const items = all[sessionId] ?? {};
  const update = useCallback(
    (fn: (c: Cart) => Cart) => setAll((a) => ({ ...a, [sessionId]: fn(a[sessionId] ?? {}) })),
    [setAll, sessionId],
  );
  const clear = useCallback(
    () =>
      setAll((a) => {
        const next = { ...a };
        delete next[sessionId];
        return next;
      }),
    [setAll, sessionId],
  );
  return { items, update, clear };
}

export const bump = (cart: Cart, id: string, delta: number): Cart => {
  const qty = Math.max(0, (cart[id] ?? 0) + delta);
  const next = { ...cart };
  if (qty === 0) delete next[id];
  else next[id] = qty;
  return next;
};
