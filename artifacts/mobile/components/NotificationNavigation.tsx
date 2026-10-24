import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";

export function NotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === "web" || Constants.executionEnvironment === "storeClient") return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    import("expo-notifications").then(async (notifications) => {
      if (cancelled) return;
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
        }),
      });
      const listener = notifications.addNotificationResponseReceivedListener(() => router.replace("/"));
      cleanup = () => listener.remove();
      const initial = await notifications.getLastNotificationResponseAsync();
      if (initial && !cancelled) {
        await notifications.clearLastNotificationResponseAsync();
        router.replace("/");
      }
    }).catch(() => { /* The activation control reports missing native configuration. */ });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return null;
}
