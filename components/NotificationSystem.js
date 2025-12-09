"use client";

import { useState, useCallback, createContext, useContext } from "react";
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
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
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
          bg: "bg-emerald-500/10 border-emerald-500/30",
          text: "text-emerald-400",
          icon: <FaCheckCircle className="text-emerald-400 text-lg" />,
        };
      case "error":
        return {
          bg: "bg-red-500/10 border-red-500/30",
          text: "text-red-400",
          icon: <FaTimesCircle className="text-red-400 text-lg" />,
        };
      case "warning":
        return {
          bg: "bg-yellow-500/10 border-yellow-500/30",
          text: "text-yellow-400",
          icon: <FaExclamationCircle className="text-yellow-400 text-lg" />,
        };
      case "info":
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/30",
          text: "text-blue-400",
          icon: <FaInfoCircle className="text-blue-400 text-lg" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles.bg} border ${styles.text} px-4 py-3 rounded-lg flex items-start gap-3 backdrop-blur-sm`}
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
