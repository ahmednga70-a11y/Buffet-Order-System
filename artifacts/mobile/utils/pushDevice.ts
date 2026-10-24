import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getNotificationConfig, registerNotificationDevice, unregisterNotificationDevice } from "@workspace/api-client-react";
import type { NotificationDevice } from "@workspace/api-client-react";

const DEVICE_KEY = "buffet_push_device";
let registrationInFlight: Promise<boolean> | null = null;
export const getRegisteredDevice = () => AsyncStorage.getItem(DEVICE_KEY);
export const saveRegisteredDevice = (id: string) => AsyncStorage.setItem(DEVICE_KEY, id);

export async function requestPushPermission(prompt: boolean) {
  if (Platform.OS === "web") {
    if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      if (prompt) throw new Error("هذا المتصفح لا يدعم الإشعارات الخلفية. جرّب Chrome أو ثبّت الموقع على الشاشة الرئيسية في iPhone.");
      return false;
    }
    const permission = prompt && Notification.permission === "default"
      ? await Notification.requestPermission() : Notification.permission;
    if (permission !== "granted" && prompt) throw new Error("الإشعارات غير مسموحة. فعّل إذن الإشعارات من إعدادات المتصفح ثم حاول تاني.");
    return permission === "granted";
  }
  if (Constants.executionEnvironment === "storeClient") {
    if (prompt) throw new Error("الإشعارات الخلفية تحتاج نسخة APK مستقلة؛ لا تعمل داخل Expo Go.");
    return false;
  }
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    // Android channel sounds are immutable. Use a new ID for the bundled bell.
    await Notifications.setNotificationChannelAsync("orders-doorbell-v1", {
      name: "طلبات البوفيه — جرس الباب", importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250], sound: "door_bell.mp3",
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = prompt && existing.status !== "granted" ? await Notifications.requestPermissionsAsync() : existing;
  if (permission.status !== "granted" && prompt) throw new Error("فعّل إذن الإشعارات من إعدادات الجهاز.");
  return permission.status === "granted";
}
export async function createPushDevice(publicKey: string): Promise<NotificationDevice> {
  if (Platform.OS === "web") {
    const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
    const data = subscription.toJSON();
    return { platform: "web", endpoint: data.endpoint, p256dh: data.keys?.p256dh, auth: data.keys?.auth };
  }
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ?? Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("إعداد إشعارات APK ناقص: اربط مشروع Expo واضبط projectId وبيانات FCM ثم ابنِ نسخة جديدة.");
  const Notifications = await import("expo-notifications");
  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return { platform: "expo", token: result.data };
}
export async function disablePushDevice() {
  await registrationInFlight?.catch(() => {});
  const id = await getRegisteredDevice();
  if (id) {
    try { await unregisterNotificationDevice(id); }
    catch (error: unknown) {
      if (![401, 403].includes((error as { status?: number }).status ?? 0)) throw error;
    }
  }
  if (Platform.OS === "web" && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  }
  await AsyncStorage.removeItem(DEVICE_KEY);
}

export function enablePushDevice(prompt: boolean): Promise<boolean> {
  if (registrationInFlight) return registrationInFlight;
  registrationInFlight = (async () => {
    if (!await requestPushPermission(prompt)) return false;
    const config = await getNotificationConfig();
    const device = await createPushDevice(config.publicKey);
    const registered = await registerNotificationDevice(device);
    await saveRegisteredDevice(registered.id);
    return true;
  })().finally(() => { registrationInFlight = null; });
  return registrationInFlight;
}
