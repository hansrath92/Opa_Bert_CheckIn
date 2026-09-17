function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function subscribeToPush(contactId: string): Promise<void> {
  const registration = await navigator.serviceWorker.register("/sw.js");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Berechtigung wurde nicht erteilt");
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ) as BufferSource,
  });

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...subscription.toJSON(), contact_id: contactId }),
  });

  if (!response.ok) {
    throw new Error("Speichern des Abonnements fehlgeschlagen");
  }
}
