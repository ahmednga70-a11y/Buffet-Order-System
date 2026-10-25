import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { disablePushDevice, enablePushDevice, getRegisteredDevice, requestPushPermission } from "@/utils/pushDevice";
import { createNotificationPreferences } from "@/utils/notificationPreferences";
import colors from "@/constants/colors";

const preferences = createNotificationPreferences(AsyncStorage);

export function PushNotificationControl() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(0);
  const mutating = useRef(false);
  useEffect(() => {
    operation.current++;
    let cancelled = false;
    let checking = false;
    let retryNeeded = false;
    setEnabled(false); setReady(false); setBusy(true); setError("");
    const restore = async () => {
      if (cancelled || checking || mutating.current || !user) return;
      const version = operation.current;
      const current = () => !cancelled && operation.current === version;
      checking = true;
      setBusy(true);
      try {
        let wanted = await preferences.read(user.id, user.projectId, "push");
        if (!current()) return;
        if (wanted === null && await getRegisteredDevice()) {
          // Migrate an existing enabled device without asking for permission again.
          await preferences.write(user.id, user.projectId, "push", true);
          wanted = true;
        }
        if (!current()) return;
        setEnabled(wanted === true);
        if (!wanted) { retryNeeded = false; setReady(false); return; }
        const permitted = await requestPushPermission(false);
        if (!current()) return;
        if (!permitted) {
          retryNeeded = true;
          setReady(false);
          setError("اختيار التفعيل محفوظ، لكن إذن الإشعارات أو دعمها غير متاح حاليًا. راجع إعدادات الجهاز أو المتصفح.");
          return;
        }
        const active = await enablePushDevice(false);
        if (current()) {
          setReady(active); retryNeeded = !active;
          setError(active ? "" : "التفعيل محفوظ. سنحاول توصيل الإشعارات تلقائيًا عند عودة الاتصال.");
        }
      } catch {
        retryNeeded = true;
        if (current()) {
          setReady(false);
          setError("اختيارك لم يُحذف. تعذّر توصيل الإشعارات الآن؛ سنعيد المحاولة تلقائيًا عند عودة الاتصال.");
        }
      } finally {
        checking = false;
        if (current()) setBusy(false);
      }
    };
    void restore();
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void restore();
    });
    const retry = setInterval(() => { if (retryNeeded) void restore(); }, 30000);
    if (Platform.OS === "web") window.addEventListener("online", restore);
    return () => {
      cancelled = true;
      foreground.remove(); clearInterval(retry);
      if (Platform.OS === "web") window.removeEventListener("online", restore);
    };
  }, [user?.id, user?.projectId]);

  const toggle = async () => {
    if (!user || mutating.current) return;
    mutating.current = true;
    operation.current++;
    setBusy(true); setError("");
    try {
      if (enabled) {
        await disablePushDevice();
        await preferences.write(user.id, user.projectId, "push", false);
        setEnabled(false); setReady(false);
      } else {
        const active = await enablePushDevice(true);
        if (active) await preferences.write(user.id, user.projectId, "push", true);
        setEnabled(active); setReady(active);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذّر تفعيل الإشعارات");
    } finally { mutating.current = false; setBusy(false); }
  };
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={toggle} disabled={busy} testID="toggle-worker-notifications" accessibilityRole="button">
        {busy ? <ActivityIndicator color={colors.light.primary} /> : <Text style={styles.text}>
          {enabled ? ready ? "الإشعارات مفعّلة — إيقاف على هذا الجهاز" : "اختيار التفعيل محفوظ — إيقاف على هذا الجهاز" : "تفعيل إشعارات الطلبات على هذا الجهاز"}
        </Text>}
      </Pressable>
      <Text style={styles.hint}>{user?.role === "customer"
        ? "يصلك تنبيه عندما يكون طلبك جاهزًا أو يسجّل العامل تسليمه، حتى عند إغلاق الشاشة، بعد السماح بالإشعارات."
        : "تصلك الطلبات والاستعجال حتى عند إغلاق الشاشة، بعد السماح بالإشعارات."}</Text>
      <Text style={styles.hint}>اختيارك محفوظ لهذا الحساب والمشروع على الجهاز؛ يعود تلقائيًا عند الدخول، ويتوقف إرسال تنبيهاته عند تسجيل الخروج.</Text>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  button: { padding: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.light.primary, backgroundColor: colors.light.secondary },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "center", color: colors.light.primary },
  hint: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right", color: colors.light.mutedForeground },
  error: { fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "right", color: colors.light.destructive },
});
