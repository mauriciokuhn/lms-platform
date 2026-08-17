"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Web Push subscription hook.
 *
 * Handles the browser-side of push notifications:
 *  - requests Notification permission
 *  - subscribes the Service Worker's PushManager with the app's VAPID key
 *  - persists the subscription via POST /api/push/subscribe
 *
 * Returns the current state so the UI can render a toggle.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushNotificationsState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  /** Request permission + subscribe + persist. Returns true on success. */
  enable: () => Promise<boolean>;
  /** Unsubscribe locally (permission stays granted). */
  disable: () => Promise<boolean>;
  /** Check whether the current SW already has an active subscription. */
  refresh: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationsState {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Deferred so the setState calls are not synchronous within the effect
    // (avoids cascading renders — react-hooks/set-state-in-effect).
    (async () => {
      const ok =
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;
      setSupported(ok);
      if (ok) setPermission(Notification.permission);
    })();
  }, []);

  /** Ensure at least one service worker registration exists (push needs it). */
  const ensureRegistration = useCallback(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) return registrations[0];
    // No SW registered (dev unregisters on load) — register /sw.js on demand.
    return navigator.serviceWorker.register("/sw.js");
  }, []);

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      // Do NOT register the SW here — only check existing registrations, so
      // visiting the page in dev never re-registers /sw.js (pwa-install
      // deliberately unregisters it in dev to avoid the HMR reload loop).
      const registrations = await navigator.serviceWorker.getRegistrations();
      const registration = registrations[0];
      if (!registration) {
        setSubscribed(false);
        return;
      }
      const sub = await registration.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }, []);

  // On mount, check if already subscribed
  useEffect(() => {
    if (!supported) return;
    (async () => {
      await refresh();
    })();
  }, [supported, refresh]);

  const enable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Seu navegador não suporta notificações push.");
        return false;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError(perm === "denied" ? "Permissão negada. Habilite nas configurações do navegador." : "Permissão não concedida.");
        return false;
      }

      // Fetch VAPID public key
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) {
        setError("Não foi possível configurar notificações agora.");
        return false;
      }
      const { vapidPublicKey } = await keyRes.json();
      if (!vapidPublicKey) {
        setError("Notificações ainda não configuradas no servidor.");
        return false;
      }

      // Register SW if needed, then subscribe
      const registration = await ensureRegistration();
      // pushManager.subscribe requires an ACTIVE worker. In dev the app
      // unregisters the SW on load (pwa-install), so the on-demand
      // registration here may still be installing/activating — wait for
      // the active worker before subscribing ("no active Service Worker").
      if (!registration.active) {
        await navigator.serviceWorker.ready;
      }
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Persist subscription
      const subJson = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });
      if (!res.ok) {
        setError("Não foi possível salvar a inscrição.");
        return false;
      }

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push enable error:", err);
      setError("Erro ao ativar notificações.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [ensureRegistration]);

  const disable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }
      setSubscribed(false);
      return true;
    } catch {
      setSubscribed(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, error, enable, disable, refresh };
}
