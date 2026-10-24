import {
  useDeliverOrder,
  useGetOrders,
  getGetOrdersQueryKey,
  getGetDailyStatsQueryKey,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { PushNotificationControl } from "@/components/PushNotificationControl";
import { useWorkerAlertSound } from "@/hooks/useWorkerAlertSound";

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export default function WorkerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const previousOrdersRef = useRef<Map<string, string | undefined> | null>(null);
  const [orderNotice, setOrderNotice] = useState("");
  const [deliveryTarget, setDeliveryTarget] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState("");
  const { enabled: soundEnabled, busy: soundBusy, error: soundError, needsGesture, resume: resumeSound, toggle: toggleSound, playAlert } = useWorkerAlertSound();

  const { data: orders, isLoading, refetch, isRefetching } = useGetOrders(
    { status: "pending" },
    { query: { refetchInterval: 5000, queryKey: getGetOrdersQueryKey({ status: "pending" }) } }
  );

  const deliverOrderMutation = useDeliverOrder();

  useEffect(() => {
    if (!orders) return;
    const previous = previousOrdersRef.current;
    if (previous && orders.some((order) => !previous.has(order.id) || (order.urgentAt && !previous.get(order.id)))) {
      setOrderNotice(orders.some((order) => order.urgentAt && !previous.get(order.id))
        ? "فيه طلب مستعجل — راجع الطلبات المميزة بالأحمر" : "وصل طلب جديد");
      playAlert();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
    previousOrdersRef.current = new Map(orders.map((order) => [order.id, order.urgentAt]));
  }, [orders, playAlert]);

  const handleDeliver = async (id: string) => {
    setDeliveryError("");
    try {
      await deliverOrderMutation.mutateAsync({ id });
      queryClient.setQueryData<Order[]>(getGetOrdersQueryKey({ status: "pending" }),
        (current) => current?.filter((order) => order.id !== id));
      setDeliveryTarget(null);
      setOrderNotice("تم تسجيل التسليم — في انتظار تأكيد العميل");
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDailyStatsQueryKey() }),
      ]);
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;
      setDeliveryError(status === 409 ? "حالة الطلب اتغيّرت؛ ممكن يكون اتلغى أو تم تسليمه بالفعل. تم تحديث القائمة."
        : status === 401 ? "جلسة الدخول انتهت. سجّل دخولك مرة أخرى."
        : status === 403 ? "غير مسموح لهذا الحساب بتسليم الطلب في المشروع الحالي."
        : status === 404 ? "الطلب غير موجود في المشروع الحالي. تم تحديث القائمة."
        : "تعذّر تسجيل التسليم. تحقق من الاتصال وحدّث القائمة قبل المحاولة مرة أخرى.");
      await queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
    }
  };

  const renderItem = ({ item }: { item: NonNullable<typeof orders>[0] }) => (
    <View style={[styles.card, item.urgentAt ? styles.urgentCard : undefined]}>
      <View style={styles.cardRow}>
        <View style={styles.cardInfo}>
          <View style={styles.pendingDot} />
          <View>
            <Text style={styles.personName}>{item.userDisplayName}</Text>
            <Text style={styles.itemName}>{item.menuItemNameAr}</Text>
            {item.urgentAt ? <Text style={styles.urgentLabel}>مستعجل — العميل طلب تنبيه</Text> : null}
            {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}
            <Text style={styles.time}>الساعة {formatTime(item.createdAt)}</Text>
          </View>
        </View>
        <Pressable
          testID={`deliver-order-${item.id}`}
          accessibilityRole="button"
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}
          onPress={() => { setDeliveryError(""); setDeliveryTarget(item.id); }}
          disabled={deliverOrderMutation.isPending}
        >
          <Text style={styles.doneBtnText}>{deliverOrderMutation.isPending && deliverOrderMutation.variables?.id === item.id ? "جارٍ التسليم…" : "سلّمت ✓"}</Text>
        </Pressable>
      </View>
      {deliveryTarget === item.id ? <View style={styles.deliveryConfirmation}>
        <Text style={styles.deliveryPrompt}>تأكيد تسليم «{item.menuItemNameAr}» إلى {item.userDisplayName}؟</Text>
        <View style={styles.deliveryActions}>
          <Pressable testID={`keep-pending-${item.id}`} accessibilityRole="button"
            style={styles.backButton} disabled={deliverOrderMutation.isPending} onPress={() => setDeliveryTarget(null)}>
            <Text style={styles.noticeText}>رجوع بدون تسليم</Text>
          </Pressable>
          <Pressable testID={`confirm-deliver-${item.id}`} accessibilityRole="button"
            style={styles.doneBtn} disabled={deliverOrderMutation.isPending} onPress={() => handleDeliver(item.id)}>
            <Text style={styles.doneBtnText}>{deliverOrderMutation.isPending ? "جارٍ الحفظ…" : "تأكيد التسليم"}</Text>
          </Pressable>
        </View>
      </View> : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>الطلبات الجديدة</Text>
          {orders && orders.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{orders.length} طلب في الانتظار</Text>
            </View>
          )}
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>خروج</Text>
        </Pressable>
      </View>

      <PushNotificationControl />
      {deliveryError ? <Text testID="delivery-error" accessibilityRole="alert" style={styles.deliveryError}>{deliveryError}</Text> : null}
      {Platform.OS === "web" ? <View style={styles.soundControl}>
        <Pressable testID="worker-alert-sound" accessibilityRole="button"
          disabled={soundBusy} onPress={toggleSound} style={styles.notice}>
          {soundBusy ? <ActivityIndicator color={colors.light.primary} /> :
            <Text style={styles.noticeText}>{soundEnabled ? "جرس العامل مفعّل — إيقاف الصوت" : "تجربة وتفعيل جرس العامل"}</Text>}
        </Pressable>
        <Text style={styles.soundHint}>اختيار الجرس محفوظ ويعود عند فتح الصفحة. قد يطلب المتصفح تفاعلًا للسماح بالصوت؛ صوت الموقع المقفول يحدده النظام.</Text>
        {needsGesture ? <Pressable testID="resume-worker-sound" accessibilityRole="button"
          onPress={() => { void resumeSound(); }} style={styles.notice}>
          <Text style={styles.noticeText}>تشغيل الجرس لهذا المتصفح</Text>
        </Pressable> : null}
        {soundError ? <Text accessibilityRole="alert" style={styles.soundError}>{soundError}</Text> : null}
      </View> : null}
      {orderNotice ? <Pressable onPress={() => setOrderNotice("")} style={styles.notice} accessibilityRole="button">
        <Text style={styles.noticeText}>{orderNotice} — إخفاء</Text>
      </Pressable> : null}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={[...(orders || [])].sort((a, b) => Number(!!b.urgentAt) - Number(!!a.urgentAt))}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Platform.OS === "web" ? 100 : 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>مفيش طلبات دلوقتي</Text>
              <Text style={styles.emptySubText}>هيبان هنا لما حد يطلب</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.light.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  deliveryConfirmation: { paddingTop: 14, gap: 10 },
  deliveryPrompt: { fontFamily: "Inter_600SemiBold", color: colors.light.foreground, fontSize: 14, textAlign: "right" },
  deliveryActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  backButton: { padding: 10, borderRadius: colors.radius, backgroundColor: colors.light.secondary },
  deliveryError: { marginHorizontal: 16, marginBottom: 12, fontFamily: "Inter_500Medium", fontSize: 13, color: colors.light.destructive, textAlign: "right" },
  soundControl: { paddingBottom: 12 },
  soundHint: { marginHorizontal: 16, fontSize: 11, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, textAlign: "right" },
  soundError: { marginHorizontal: 16, fontSize: 12, fontFamily: "Inter_500Medium", color: colors.light.destructive, textAlign: "right" },
  notice: { marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 8, backgroundColor: colors.light.secondary },
  noticeText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.light.primary, textAlign: "right" },
  urgentCard: { borderColor: colors.light.destructive, borderLeftColor: colors.light.destructive },
  urgentLabel: { color: colors.light.destructive, fontFamily: "Inter_700Bold", fontSize: 13, marginBottom: 4 },
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.light.foreground, marginBottom: 4 },
  countBadge: {
    backgroundColor: "#FFF3E0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  countBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.light.primary },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.light.secondary },
  logoutText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.light.primary },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.pending,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardInfo: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.pending,
    marginTop: 6,
  },
  personName: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.light.foreground, marginBottom: 2 },
  itemName: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.light.primary, marginBottom: 2 },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, marginBottom: 2 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  doneBtn: {
    backgroundColor: colors.light.success,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  doneBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  empty: { alignItems: "center", marginTop: 100, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  emptySubText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
});
