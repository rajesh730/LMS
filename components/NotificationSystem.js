"use client";

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimesCircle,
  FaTimes,
} from "react-icons/fa";

// Create notification context
export const NotificationContext = createContext();

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const mounted = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false
  );

  const addNotification = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = Date.now();
      const notification = { id, message, type };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback(
    (message, duration) => addNotification(message, "success", duration),
    [addNotification]
  );
  const error = useCallback(
    (message, duration) => addNotification(message, "error", duration),
    [addNotification]
  );
  const info = useCallback(
    (message, duration) => addNotification(message, "info", duration),
    [addNotification]
  );
  const warning = useCallback(
    (message, duration) => addNotification(message, "warning", duration),
    [addNotification]
  );

  const value = {
    addNotification,
    removeNotification,
    success,
    error,
    info,
    warning,
    notifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {mounted && (
        <NotificationContainer
          notifications={notifications}
          onRemove={removeNotification}
        />
      )}
    </NotificationContext.Provider>
  );
}

function NotificationContainer({ notifications, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationItem({ notification, onClose }) {
  const { message, type } = notification;

  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-50 border-emerald-500/30",
          text: "text-emerald-800",
          icon: <FaCheckCircle className="text-emerald-700 text-lg" />,
        };
      case "error":
        return {
          bg: "bg-red-50 border-red-500/30",
          text: "text-red-800",
          icon: <FaTimesCircle className="text-red-700 text-lg" />,
        };
      case "warning":
        return {
          bg: "bg-amber-50 border-amber-500/30",
          text: "text-amber-800",
          icon: <FaExclamationCircle className="text-amber-700 text-lg" />,
        };
      case "info":
      default:
        return {
          bg: "bg-[#eaf2ff] border-[#2f7fdb]/30",
          text: "text-[#0a2f66]",
          icon: <FaInfoCircle className="text-[#0a2f66] text-lg" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles.bg} ${styles.text} flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-[#0a2f66]/10 backdrop-blur-sm`}
    >
      {styles.icon}
      <div className="flex-1">
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-lg opacity-60 hover:opacity-100 transition flex-shrink-0"
      >
        <FaTimes />
      </button>
    </div>
  );
}
