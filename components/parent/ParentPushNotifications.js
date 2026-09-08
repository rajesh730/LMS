"use client";

import { useEffect, useState } from "react";

function applicationServerKey(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = window.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export default function ParentPushNotifications() {
  const [state, setState] = useState({
    loading: true,
    supported: true,
    configured: true,
    allowedOnDevice: true,
    subscribed: false,
    permission: "default",
    publicKey: "",
    error: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) {
        if (active) setState((current) => ({ ...current, loading: false, supported: false }));
        return;
      }
      try {
        const response = await fetch("/api/parent/push-subscription", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || "Could not load push settings");
        const config = json.data || {};
        const registration = await navigator.serviceWorker.getRegistration();
        let subscription = await registration?.pushManager.getSubscription();
        let subscribed = false;

        if (
          subscription &&
          (!config.allowedOnDevice || Notification.permission === "denied")
        ) {
          await subscription.unsubscribe().catch(() => false);
          subscription = null;
        }

        // A browser subscription can survive sign-out. Rebinding an existing
        // endpoint to the current authenticated parent prevents a shared
        // browser from continuing to receive the previous account's alerts.
        if (
          subscription &&
          Notification.permission === "granted" &&
          config.enabled &&
          config.allowedOnDevice
        ) {
          const bindResponse = await fetch("/api/parent/push-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription.toJSON()),
          });
          const bindJson = await bindResponse.json().catch(() => ({}));
          if (!bindResponse.ok) {
            throw new Error(bindJson.message || "Could not register this device");
          }
          subscribed = true;
        }

        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            configured: Boolean(config.enabled),
            allowedOnDevice: config.allowedOnDevice !== false,
            subscribed,
            permission: Notification.permission,
            publicKey: config.publicKey || "",
          }));
        }
      } catch (error) {
        if (active) setState((current) => ({ ...current, loading: false, error: error.message }));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const enable = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");
      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(state.publicKey),
        }));
      const response = await fetch("/api/parent/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not enable notifications");
      setState((current) => ({ ...current, loading: false, subscribed: true, permission }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  const disable = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/parent/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json.message || "Could not disable notifications");
        }
        await subscription.unsubscribe();
      }
      setState((current) => ({ ...current, loading: false, subscribed: false }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  const unavailable =
    !state.supported || !state.configured || !state.allowedOnDevice;
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex min-w-0 flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--brand-ink)]">Phone push notifications</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--brand-muted)]">
            {state.subscribed
              ? "Enabled. Alerts can appear with your phone's normal notification sound, even when Pravyo is closed."
              : !state.allowedOnDevice
                ? "Push alerts are disabled on shared phones to keep family messages private."
              : unavailable
                ? "Not available on this device yet. On iPhone, add Pravyo to the Home Screen first."
                : "Enable alerts for messages, notices, consent requests and events."}
          </p>
        </div>
        <button
          type="button"
          onClick={state.subscribed ? disable : enable}
          disabled={state.loading || unavailable || state.permission === "denied"}
          className="min-h-[44px] shrink-0 rounded-xl border-2 border-[var(--brand-primary)] px-4 text-sm font-bold text-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.loading ? "Checking…" : state.subscribed ? "Turn off" : "Enable"}
        </button>
      </div>
      {state.permission === "denied" ? (
        <p className="mt-2 text-xs font-medium text-amber-800">Notifications are blocked in this device’s settings.</p>
      ) : null}
      {state.error ? <p className="mt-2 break-words text-xs text-red-700">{state.error}</p> : null}
    </div>
  );
}
