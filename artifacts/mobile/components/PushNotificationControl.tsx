import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { disablePushDevice, enablePushDevice, getRegisteredDevice } from "@/utils/pushDevice";
import colors from "@/constants/colors";

export function PushNotificationControl() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!await getRegisteredDevice() || cancelled) return;
      const active = await enablePushDevice(false);
      if (!cancelled) setEnabled(active);
    };
    restore().catch(() => {
      if (!cancelled) setError("تعذّر التحقق من الإشعارات. فعّلها مرة أخرى عند الاتصال بالإنترنت.");
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.projectId]);

  const toggle = async () => {
    setBusy(true); setError("");
    try {
      if (enabled) {
        await disablePushDevice(); setEnabled(false);
      } else {
        setEnabled(await enablePushDevice(true));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذّر تفعيل الإشعارات");
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={toggle} disabled={busy} testID="toggle-worker-notifications" accessibilityRole="button">
        {busy ? <ActivityIndicator color={colors.light.primary} /> : <Text style={styles.text}>
          {enabled ? "الإشعارات مفعّلة — إيقاف على هذا الجهاز" : "تفعيل إشعارات الطلبات على هذا الجهاز"}
        </Text>}
      </Pressable>
      <Text style={styles.hint}>تصلك الطلبات والاستعجال حتى عند إغلاق الشاشة، بعد السماح بالإشعارات.</Text>
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
