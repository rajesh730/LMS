"use client";

/** Remove only this browser's endpoint; other parent devices remain enabled. */
export async function detachCurrentParentPushDevice() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;

  try {
    await fetch("/api/parent/push-subscription", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      keepalive: true,
    });
  } finally {
    // Even if the network is gone, invalidating the browser endpoint prevents
    // private alerts after this account signs out. The server removes the stale
    // row on its first 404/410 delivery response.
    await subscription.unsubscribe().catch(() => false);
  }
}

