"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createTranslator } from "@/lib/parentI18n";

/**
 * The Parent App's single source of client state: who the guardian is, which
 * child is selected, and their accessibility preferences.
 *
 * The selected child is the most important value here. Every screen reads it,
 * and §36 forbids mixing school context between children — so child selection
 * lives in ONE place, is persisted per guardian, and is always validated
 * against the server's list of authorised children before use. A stale
 * selection (a link the school revoked since last visit) silently falls back to
 * the first available child rather than showing an error or, worse, another
 * child's data.
 */

const ParentAppContext = createContext(null);

// Namespaced by parent id so two guardians sharing a device do not inherit each
// other's selected child.
const storageKey = (parentId) => `pravyo.parent.${parentId}.selectedChild`;

export function ParentAppProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    parent: null,
    preferences: {
      simpleMode: false,
      language: "en",
      calendarPreference: "BS",
      dataSaver: false,
    },
    childList: [],
    selectedChildId: null,
  });

  const load = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: "" }));

      const res = await fetch("/api/parent/me", { cache: "no-store" });
      const json = await res.json();

      // No usable session — the cookie expired, the school revoked access, or
      // this is a shared phone that went idle. Send them to sign in rather than
      // painting an error screen with no way forward: signing in again is one
      // scan or one Parent ID, so a dead end here is pure obstruction.
      if (res.status === 401) {
        window.location.assign("/parent/login");
        return;
      }

      if (!res.ok) {
        throw new Error(json.message || "Failed to load your account");
      }

      const { parent, preferences, children: childList } = json.data;

      // Restore the previous selection, but only if the school still authorises
      // it. This is the guard against a revoked link lingering in the UI.
      let selectedChildId = childList[0]?.studentId || null;
      try {
        const stored = window.localStorage.getItem(storageKey(parent.id));
        if (stored && childList.some((c) => c.studentId === stored)) {
          selectedChildId = stored;
        }
      } catch {
        // Private browsing or blocked storage — fall back to the first child.
      }

      setState({
        loading: false,
        error: "",
        parent,
        preferences,
        childList,
        selectedChildId,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Something went wrong",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectChild = useCallback(
    (studentId) => {
      setState((prev) => {
        if (!prev.childList.some((c) => c.studentId === studentId)) {
          return prev;
        }
        try {
          if (prev.parent?.id) {
            window.localStorage.setItem(storageKey(prev.parent.id), studentId);
          }
        } catch {
          // Non-fatal: the selection still applies for this session.
        }
        return { ...prev, selectedChildId: studentId };
      });
    },
    []
  );

  /**
   * Update a preference. Applied optimistically so Simple Mode and the language
   * switch feel instant — a guardian toggling "bigger text" should not wait on
   * a 69ms-RTT round trip to see it. Reverted if the save fails.
   */
  const updatePreferences = useCallback(async (patch) => {
    let previous;
    setState((prev) => {
      previous = prev.preferences;
      return { ...prev, preferences: { ...prev.preferences, ...patch } };
    });

    try {
      const res = await fetch("/api/parent/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      setState((prev) => ({ ...prev, preferences: previous }));
    }
  }, []);

  const selectedChild = useMemo(
    () =>
      state.childList.find((c) => c.studentId === state.selectedChildId) || null,
    [state.childList, state.selectedChildId]
  );

  // Nav badge counts, keyed by the destination href the nav uses. Held here
  // rather than in the shell so any screen can refresh them after an action
  // (opening a notice, reading a thread) without prop-drilling a callback.
  const [badges, setBadges] = useState({});

  const refreshBadges = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const res = await fetch(
        `/api/parent/home?studentId=${encodeURIComponent(studentId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = await res.json();
      const counts = json?.data?.badges || {};
      setBadges({
        "/parent": counts.noticesActionRequired || 0,
        notifications: counts.notifications || 0,
      });
    } catch {
      // Badges are decoration — a failure here must never break a screen.
    }
  }, []);

  useEffect(() => {
    refreshBadges(state.selectedChildId);
  }, [state.selectedChildId, refreshBadges]);

  const t = useMemo(
    () => createTranslator(state.preferences.language),
    [state.preferences.language]
  );

  const value = useMemo(
    () => ({
      ...state,
      selectedChild,
      selectChild,
      updatePreferences,
      reload: load,
      badges,
      refreshBadges: () => refreshBadges(state.selectedChildId),
      t,
      simpleMode: state.preferences.simpleMode,
      // True when the guardian has an account but no authorised child (§26).
      needsChildLink: !state.loading && state.childList.length === 0,
    }),
    [
      state,
      selectedChild,
      selectChild,
      updatePreferences,
      load,
      badges,
      refreshBadges,
      t,
    ]
  );

  return (
    <ParentAppContext.Provider value={value}>
      {children}
    </ParentAppContext.Provider>
  );
}

export function useParentApp() {
  const context = useContext(ParentAppContext);
  if (!context) {
    throw new Error("useParentApp must be used inside <ParentAppProvider>");
  }
  return context;
}

/**
 * Fetch helper that always carries the selected child.
 *
 * Every parent endpoint needs `studentId`, and forgetting it is the single
 * easiest way to accidentally show the wrong child's data. Routing all parent
 * data fetching through this hook makes that omission impossible.
 */
export function useParentFetch() {
  const { selectedChildId } = useParentApp();

  return useCallback(
    async (path, options = {}) => {
      if (!selectedChildId) {
        throw new Error("No child selected");
      }

      const url = new URL(path, window.location.origin);
      url.searchParams.set("studentId", selectedChildId);

      const res = await fetch(url.toString(), {
        cache: "no-store",
        ...options,
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.message || "Something went wrong");
      }
      return json.data;
    },
    [selectedChildId]
  );
}

/**
 * Load a parent endpoint for the selected child, with loading/error state.
 *
 * Every screen needs the same three things — fetch on mount, refetch when the
 * child changes, and expose a retry — so they share one implementation.
 *
 * The state update happens inside the async callback rather than in the effect
 * body: setting state synchronously during an effect triggers a cascading
 * re-render, which React's lint rules (correctly) reject. The `active` flag
 * discards a response that arrives after the child has already been switched,
 * which is otherwise a real way to paint one child's data under another's name.
 */
export function useParentResource(path, { enabled = true } = {}) {
  const { selectedChildId } = useParentApp();
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled || !selectedChildId || !path) return undefined;

    let active = true;

    (async () => {
      try {
        const url = new URL(path, window.location.origin);
        url.searchParams.set("studentId", selectedChildId);

        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok) {
          setState({
            loading: false,
            error: json.message || "Something went wrong",
            data: null,
          });
          return;
        }
        setState({ loading: false, error: "", data: json.data });
      } catch (err) {
        if (active) {
          setState({ loading: false, error: err.message, data: null });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [path, selectedChildId, enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return { ...state, reload };
}

/**
 * Read a browser capability without tripping the "no setState in effect" rule.
 *
 * `useSyncExternalStore` is the right tool: the value is genuinely external to
 * React, never changes during a session, and needs a distinct server snapshot
 * so SSR does not claim a capability the server cannot have.
 */
export function useClientCapability(check) {
  return useSyncExternalStore(
    // Never changes, so the subscribe function has nothing to do.
    () => () => {},
    () => Boolean(check()),
    () => false
  );
}
