"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNotification } from "@/components/NotificationSystem";
import { useParentApp } from "@/components/parent/ParentAppContext";
import useRealtimeChannel from "@/lib/client/useRealtimeChannel";
import {
  installNotificationSoundUnlock,
  playNewNotificationSound,
} from "@/lib/client/notificationSound";
import { detachCurrentParentPushDevice } from "@/lib/client/parentPushSubscription";
import {
  NOTIFICATION_EVENTS,
  parentNotificationsChannel,
} from "@/lib/notificationChannels";

const ParentNotificationContext = createContext(null);
const SIGNAL_HISTORY_LIMIT = 40;

async function responseData(response, fallbackMessage) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || fallbackMessage);
  return json.data || {};
}

function signalIsNewForThisBrowser(parentId, signal, mountedAt) {
  const notificationId = String(signal?.notificationId || "");
  if (!notificationId) return false;

  const createdAt = new Date(signal.createdAt || 0).getTime();
  // Redis streams can outlive a browser session. Historical change events may
  // refresh state, but they must never replay old notification sounds.
  if (Number.isFinite(createdAt) && createdAt < mountedAt - 5000) return false;

  try {
    const key = `pravyo.parent.${parentId}.notification-signals`;
    const previous = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (Array.isArray(previous) && previous.includes(notificationId)) return false;
    const next = [notificationId, ...(Array.isArray(previous) ? previous : [])]
      .filter(Boolean)
      .slice(0, SIGNAL_HISTORY_LIMIT);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Storage can be blocked in private mode; the in-memory event id still
    // prevents duplicates within this mounted provider.
  }
  return true;
}

export function ParentNotificationProvider({ children }) {
  const { parent, refreshBadges } = useParentApp();
  const { info, error: notifyError } = useNotification();
  const mountedAtRef = useRef(Date.now());
  const eventIdsRef = useRef(new Set());
  const [state, setState] = useState({
    loading: true,
    error: "",
    notifications: [],
    unreadCount: 0,
  });

  const refresh = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setState((current) => ({ ...current, loading: true, error: "" }));
      }

      const [listResponse, countResponse] = await Promise.all([
        fetch("/api/notifications?limit=50", { cache: "no-store" }),
        fetch("/api/notifications/unread-count", { cache: "no-store" }),
      ]);
      const [list, count] = await Promise.all([
        responseData(listResponse, "Could not load notifications"),
        responseData(countResponse, "Could not load notification count"),
      ]);
      const notifications = Array.isArray(list.notifications)
        ? list.notifications
        : [];
      const unreadCount = Number.isFinite(count.unreadCount)
        ? count.unreadCount
        : Number(list.unreadCount || 0);

      setState({ loading: false, error: "", notifications, unreadCount });
      return notifications;
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Could not load notifications",
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => installNotificationSoundUnlock(), []);

  // A browser push endpoint can outlive its login cookie. Shared-device mode
  // must invalidate any endpoint already present in this browser, including
  // one left behind by a previous account whose session expired.
  useEffect(() => {
    if (parent?.deviceMode === "SHARED") {
      void detachCurrentParentPushDevice().catch(() => {});
    }
  }, [parent?.deviceMode]);

  const handleSignal = useCallback(
    async (event) => {
      const signal = event?.payload || event || {};
      const signalId = String(event?.id || signal.notificationId || "");
      if (signalId && eventIdsRef.current.has(signalId)) return;
      if (signalId) {
        eventIdsRef.current.add(signalId);
        if (eventIdsRef.current.size > 100) {
          eventIdsRef.current.delete(eventIdsRef.current.values().next().value);
        }
      }

      const notifications = await refresh({ silent: true });
      refreshBadges();

      if (
        signal.type !== NOTIFICATION_EVENTS.NEW ||
        !signalIsNewForThisBrowser(parent?.id, signal, mountedAtRef.current)
      ) {
        return;
      }

      const notification = notifications?.find(
        (item) => item.id === String(signal.notificationId)
      );
      const prefix = notification?.type === "MESSAGE" ? "New message" : "New notice";
      info(
        notification?.title ? `${prefix}: ${notification.title}` : prefix,
        5000
      );
      await playNewNotificationSound();
    },
    [info, parent?.id, refresh, refreshBadges]
  );

  useRealtimeChannel(
    parent?.id ? parentNotificationsChannel(parent.id) : "",
    handleSignal,
    { enabled: Boolean(parent?.id) }
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const onMessage = (event) => {
      if (event.data?.type !== "PRAVYO_PUSH_NOTIFICATION") return;
      void handleSignal({
        payload: {
          ...event.data,
          type: event.data.notificationEventType || NOTIFICATION_EVENTS.NEW,
        },
      });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [handleSignal]);

  const markSeen = useCallback(async () => {
    setState((current) => ({
      ...current,
      unreadCount: 0,
      notifications: current.notifications.map((notification) =>
        notification.status === "UNREAD"
          ? { ...notification, status: "SEEN", seenAt: new Date().toISOString() }
          : notification
      ),
    }));

    try {
      const response = await fetch("/api/notifications/mark-seen", {
        method: "PATCH",
      });
      await responseData(response, "Could not mark notifications as seen");
      refreshBadges();
    } catch {
      await refresh({ silent: true });
    }
  }, [refresh, refreshBadges]);

  const markRead = useCallback(
    async (notificationId) => {
      const readAt = new Date().toISOString();
      setState((current) => ({
        ...current,
        unreadCount: Math.max(
          0,
          current.unreadCount -
            (current.notifications.some(
              (item) => item.id === notificationId && item.status === "UNREAD"
            )
              ? 1
              : 0)
        ),
        notifications: current.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: "READ",
                seenAt: notification.seenAt || readAt,
                readAt,
              }
            : notification
        ),
      }));

      try {
        const response = await fetch(
          `/api/notifications/${encodeURIComponent(notificationId)}/read`,
          { method: "PATCH" }
        );
        await responseData(response, "Could not mark notification as read");
        refreshBadges();
        return true;
      } catch (error) {
        await refresh({ silent: true });
        notifyError(
          error.message || "Could not mark this notification as read",
          5000
        );
        throw error;
      }
    },
    [notifyError, refresh, refreshBadges]
  );

  const markAllRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      unreadCount: 0,
      notifications: current.notifications.map((notification) => ({
        ...notification,
        status: "READ",
        seenAt: notification.seenAt || readAt,
        readAt: notification.readAt || readAt,
      })),
    }));

    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
      await responseData(response, "Could not mark all notifications as read");
      refreshBadges();
    } catch (error) {
      await refresh({ silent: true });
      notifyError(error.message || "Could not mark notifications as read", 5000);
      return false;
    }
    return true;
  }, [notifyError, refresh, refreshBadges]);

  const value = useMemo(
    () => ({ ...state, refresh, markSeen, markRead, markAllRead }),
    [markAllRead, markRead, markSeen, refresh, state]
  );

  return (
    <ParentNotificationContext.Provider value={value}>
      {children}
    </ParentNotificationContext.Provider>
  );
}

export function useParentNotifications() {
  const context = useContext(ParentNotificationContext);
  if (!context) {
    throw new Error(
      "useParentNotifications must be used inside ParentNotificationProvider"
    );
  }
  return context;
}
