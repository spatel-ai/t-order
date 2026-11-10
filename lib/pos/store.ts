"use client";
// Persistence: durable restaurant data in localStorage, tab-scoped UI state in sessionStorage.
import { useCallback, useRef, useSyncExternalStore } from "react";
import { PosError } from "./actions";
import { createSeed } from "./seed";
import { DEFAULT_SETTINGS } from "./settings";
import type { ActionCtx, PosData, Staff } from "./types";

// v2: tables are numbered 1–12 and the system starts blank. Older saved data (lettered tables) is ignored.
export const DATA_KEY = "pos:v2:data";
export const SESSION_PREFIX = "pos:session:";

// ---------- localStorage: PosData ----------

type Listener = () => void;
const dataListeners = new Set<Listener>();
let dataCache: PosData | null = null;

function isPosData(v: unknown): v is PosData {
  const d = v as PosData;
  return !!d && d.version === 1 && Array.isArray(d.tables) && Array.isArray(d.sessions) && Array.isArray(d.activity) && !!d.seq;
}

function loadData(): PosData {
  if (dataCache) return dataCache;
  let parsed: unknown = null;
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (isPosData(parsed)) {
    // Fill in any fields added since this data was saved.
    dataCache = {
      ...parsed,
      menu: Array.isArray(parsed.menu) ? parsed.menu : [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } else {
    dataCache = createSeed();
    persistData(dataCache);
  }
  return dataCache;
}

function persistData(data: PosData) {
  try {
    window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode): keep working in memory for this tab.
  }
}

export function writeData(next: PosData) {
  dataCache = next;
  persistData(next);
  dataListeners.forEach((l) => l());
}

function subscribeData(listener: Listener) {
  dataListeners.add(listener);
  // Keep other tabs (e.g. a second POS terminal) in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== DATA_KEY) return;
    dataCache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    dataListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns null during server render / hydration, then the stored data. */
export function usePosData(): PosData | null {
  return useSyncExternalStore(subscribeData, loadData, () => null);
}

/** Clears every order, payment and activity event. The uploaded menu and restaurant settings are kept. */
export function clearSalesData() {
  const { menu, settings } = loadData();
  writeData({ ...createSeed(), menu, settings });
}

// ---------- sessionStorage: per-tab UI state ----------

const sessionListeners = new Map<string, Set<Listener>>();
const sessionCache = new Map<string, string | null>();

function readSessionRaw(key: string): string | null {
  if (sessionCache.has(key)) return sessionCache.get(key)!;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
  } catch {
    raw = null;
  }
  sessionCache.set(key, raw);
  return raw;
}

export function writeSession<T>(key: string, value: T | undefined) {
  const raw = value === undefined ? null : JSON.stringify(value);
  sessionCache.set(key, raw);
  try {
    if (raw === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, raw);
  } catch {
    // ignore: in-memory cache still serves this tab
  }
  sessionListeners.get(key)?.forEach((l) => l());
}

export function readSession<T>(key: string, fallback: T): T {
  const raw = readSessionRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useSessionState<T>(name: string, initial: T): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const key = SESSION_PREFIX + name;
  const initialRef = useRef(initial);
  const subscribe = useCallback(
    (l: Listener) => {
      if (!sessionListeners.has(key)) sessionListeners.set(key, new Set());
      sessionListeners.get(key)!.add(l);
      return () => sessionListeners.get(key)?.delete(l);
    },
    [key],
  );
  const raw = useSyncExternalStore(subscribe, () => readSessionRaw(key), () => null);
  const parsedRef = useRef<{ raw: string | null; value: T } | null>(null);
  if (!parsedRef.current || parsedRef.current.raw !== raw) {
    let value = initialRef.current;
    if (raw !== null) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = initialRef.current;
      }
    }
    parsedRef.current = { raw, value };
  }
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readSession(key, initialRef.current);
      writeSession(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    [key],
  );
  const clear = useCallback(() => writeSession(key, undefined), [key]);
  return [parsedRef.current.value, set, clear];
}

// ---------- staff, toast, dispatch ----------

export const DEFAULT_STAFF: Staff = { name: "Anantram Patel", role: "Cashier" };
export const MANAGER_STAFF: Staff = { name: "Anita S", role: "Manager" };

const STAFF_KEY = "staff:v2";

export function useStaff() {
  return useSessionState<Staff>(STAFF_KEY, DEFAULT_STAFF);
}

export interface ToastMessage {
  id: number;
  tone: "success" | "info" | "warning" | "error";
  message: string;
}

export function showToast(message: string, tone: ToastMessage["tone"] = "success") {
  writeSession<ToastMessage>(SESSION_PREFIX + "toast", { id: Date.now(), tone, message });
}

export function makeCtx(staff: Staff = readSession(SESSION_PREFIX + STAFF_KEY, DEFAULT_STAFF)): ActionCtx {
  return { now: new Date().toISOString(), staff };
}

/**
 * Applies a pure action to the stored data. Returns false (and shows an error toast) if the action
 * rejects the change, e.g. transferring to a table that just became occupied in another tab.
 */
export function dispatch(update: (data: PosData, ctx: ActionCtx) => PosData, staff?: Staff): boolean {
  try {
    writeData(update(loadData(), makeCtx(staff)));
    return true;
  } catch (e) {
    showToast(e instanceof PosError ? e.message : "Something went wrong. Please try again.", "error");
    if (!(e instanceof PosError)) console.error(e);
    return false;
  }
}

export function getData(): PosData {
  return loadData();
}
