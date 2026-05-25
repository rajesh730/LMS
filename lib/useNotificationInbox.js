"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotification } from "@/components/NotificationSystem";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

function defaultToastMessageBuilder(notification) {
  return notification?.title ? `New notice: ${notification.title}` : "New notice";
}

export default function useNotificationInbox({
  listUrl,
  readUrl,
  limit,
  realtimeChannel,
  toastMessageBuilder = defaultToastMessageBuilder,
  enableRealtimeToast = false,
  markVisibleOnLoad = false,
  pollIntervalMs = 60000,
}) {
  const initializedRef = useRef(false);
  const itemIdsRef = useRef(new Set());
  const toastedItemIdsRef = useRef(new Set());
  const toastMessageBuilderRef = useRef(toastMessageBuilder);
  const { info } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    toastMessageBuilderRef.current = toastMessageBuilder;
  }, [toastMessageBuilder]);

  const markNotificationsState = useCallback((items, isRead) => {
    const itemSet = new Set(
      items.map((item) => `${item.noticeType}:${item.id}`)
    );

    setNotifications((current) =>
      current.map((notification) =>
        itemSet.has(`${notification.noticeType}:${notification.id}`)
          ? { ...notification, isRead }
          : notification
      )
    );
  }, []);

  const syncReadState = useCallback(
    async ({ action = "read", notifications: items = [], allVisible = false }) => {
      const normalizedAction = action === "unread" ? "unread" : "read";
      const res = await fetch(readUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: normalizedAction,
          allVisible,
          notifications: allVisible
            ? []
            : items.map((notification) => ({
                id: notification.id,
                noticeType: notification.noticeType,
              })),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to update notification state");
      }

      if (Number.isFinite(data.unreadCount)) {
        setUnreadCount(data.unreadCount);
      }
    },
    [readUrl]
  );

  const loadNotifications = useCallback(
    async ({ silent = false, announce = false, markVisible = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError("");

        const targetUrl =
          typeof limit === "number" ? `${listUrl}?limit=${limit}` : listUrl;
        const res = await fetch(targetUrl, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Failed to load notifications");
        }

        const nextNotifications = Array.isArray(data.notifications)
          ? data.notifications
          : [];
        const previousIds = itemIdsRef.current;
        const nextIds = new Set(
          nextNotifications.map(
            (notification) => `${notification.noticeType}:${notification.id}`
          )
        );

        if (announce && enableRealtimeToast && initializedRef.current) {
          const newItems = nextNotifications.filter(
            (notification) =>
              !previousIds.has(`${notification.noticeType}:${notification.id}`) &&
              !toastedItemIdsRef.current.has(
                `${notification.noticeType}:${notification.id}`
              )
          );
          if (newItems.length > 0) {
            info(toastMessageBuilderRef.current(newItems[0]), 5000);
            toastedItemIdsRef.current.add(
              `${newItems[0].noticeType}:${newItems[0].id}`
            );
          }
        }

        const unreadItems = nextNotifications.filter(
          (notification) => !notification.isRead
        );
        const shouldMarkVisible = markVisible || markVisibleOnLoad;
        setNotifications(
          shouldMarkVisible && unreadItems.length > 0
            ? nextNotifications.map((notification) => ({
                ...notification,
                isRead: true,
              }))
            : nextNotifications
        );

        itemIdsRef.current = nextIds;
        initializedRef.current = true;
        setUnreadCount(
          Number.isFinite(data.unreadCount)
            ? data.unreadCount
            : nextNotifications.filter((notification) => !notification.isRead)
                .length
        );

        if (shouldMarkVisible && unreadItems.length > 0) {
          void syncReadState({
            action: "read",
            notifications: unreadItems,
          }).catch(() => {});
        }

        return nextNotifications;
      } catch (loadError) {
        setNotifications([]);
        setUnreadCount(0);
        setError(loadError.message || "Failed to load notifications");
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [
      enableRealtimeToast,
      info,
      limit,
      listUrl,
      markVisibleOnLoad,
      syncReadState,
    ]
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadNotifications({ silent: true });
    }, pollIntervalMs);

    return () => clearInterval(intervalId);
  }, [loadNotifications, pollIntervalMs]);

  useRealtimeChannel(
    realtimeChannel,
    useCallback(() => {
      void loadNotifications({ silent: true, announce: true });
    }, [loadNotifications])
  );

  const updateNotificationsReadState = useCallback(
    async (action, items, options = {}) => {
      const { allVisible = false } = options;
      const targetItems = Array.isArray(items) ? items : notifications;
      const normalizedAction = action === "unread" ? "unread" : "read";
      const itemsToUpdate = allVisible
        ? targetItems
        : targetItems.filter((notification) =>
            normalizedAction === "read"
              ? !notification.isRead
              : notification.isRead
          );

      if (itemsToUpdate.length === 0 && !allVisible) return;

      if (allVisible) {
        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            isRead: normalizedAction === "read",
          }))
        );
        setUnreadCount(normalizedAction === "read" ? 0 : targetItems.length);
      } else {
        markNotificationsState(itemsToUpdate, normalizedAction === "read");
        setUnreadCount((current) =>
          normalizedAction === "read"
            ? Math.max(0, current - itemsToUpdate.length)
            : Math.min(targetItems.length, current + itemsToUpdate.length)
        );
      }

      try {
        await syncReadState({
          action: normalizedAction,
          notifications: itemsToUpdate,
          allVisible,
        });
      } catch (_error) {
        await loadNotifications({ silent: true });
      }
    },
    [loadNotifications, markNotificationsState, notifications, syncReadState]
  );

  const markNotificationsRead = useCallback(
    async (items) => {
      await updateNotificationsReadState("read", items, { allVisible: false });
    },
    [updateNotificationsReadState]
  );

  const markNotificationsUnread = useCallback(
    async (items) => {
      await updateNotificationsReadState("unread", items, {
        allVisible: false,
      });
    },
    [updateNotificationsReadState]
  );

  const toggleNotificationReadState = useCallback(
    async (notification) => {
      if (!notification) return;
      await updateNotificationsReadState(
        notification.isRead ? "unread" : "read",
        [notification],
        { allVisible: false }
      );
    },
    [updateNotificationsReadState]
  );

  return useMemo(
    () => ({
      loading,
      error,
      notifications,
      unreadCount,
      setNotifications,
      loadNotifications,
      markNotificationsRead,
      markNotificationsUnread,
      toggleNotificationReadState,
      updateNotificationsReadState,
    }),
    [
      error,
      loadNotifications,
      loading,
      markNotificationsRead,
      markNotificationsUnread,
      notifications,
      toggleNotificationReadState,
      unreadCount,
      updateNotificationsReadState,
    ]
  );
}
