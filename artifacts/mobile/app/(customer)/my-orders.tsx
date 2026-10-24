import {
  useGetOrders,
  useConfirmOrder,
  useRejectOrder,
  getGetOrdersQueryKey,
  useExpediteOrder,
  useCancelOrder,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import colors from "@/constants/colors";

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: string) {
  if (status === "pending") return "في الانتظار";
  if (status === "delivered") return "في انتظار تأكيدك";
  if (status === "completed") return "وصل ✓";
  if (status === "cancelled") return "ملغي";
  return status;
}

function statusBadgeStyle(status: string) {
  if (status === "completed") return styles.badgeDone;
  if (status === "delivered") return styles.badgeDelivered;
  if (status === "cancelled") return styles.badgeCancelled;
  return styles.badgePending;
}

export default function MyOrdersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const queryClient = useQueryClient();

  const { data: orders, isLoading, refetch, isRefetching } = useGetOrders(
    { mine: true, status: "all" },
    { query: { refetchInterval: 5000, queryKey: getGetOrdersQueryKey({ mine: true, status: "all" }) } }
  );

  const confirmMutation = useConfirmOrder();
  const rejectMutation = useRejectOrder();
  const expediteMutation = useExpediteOrder();
  const cancelMutation = useCancelOrder();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{ id: string; message: string } | null>(null);

  const handleCancel = async (id: string) => {
    setCancelError(null);
    try {
      const cancelled = await cancelMutation.mutateAsync({ id });
      queryClient.setQueryData<Order[]>(getGetOrdersQueryKey({ mine: true, status: "all" }),
        (current) => current?.map((order) => order.id === id ? cancelled : order));
      setCancelTarget(null);
      await queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
    } catch (error: unknown) {
      setCancelError({ id, message: (error as { status?: number }).status === 409
        ? "حالة الطلب اتغيّرت. لا يمكن إلغاء طلب تم تسليمه."
        : "تعذّر إلغاء الطلب. تأكد من الاتصال وحاول مرة أخرى." });
      await queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
    }
  };

  const handleExpedite = async (id: string) => {
    try {
      await expediteMutation.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
    } catch {
      Alert.alert("تعذّر الاستعجال", "تأكد من الاتصال وحدّث الطلبات؛ لا يمكن استعجال طلب تم تسليمه.");
    }
  };

  // Track delivered order IDs to detect new deliveries and show a notification
  const prevDeliveredIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const deliveredOrders = (orders || []).filter((o) => o.status === "delivered");
    const newlyDelivered = deliveredOrders.filter((o) => !prevDeliveredIds.current.has(o.id));

    if (newlyDelivered.length > 0) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const order = newlyDelivered[0];
      Alert.alert(
        "🔔 طلبك وصل!",
        `وصل "${order.menuItemNameAr}" — هل استلمته؟`,
        [
          {
            text: "لأ، مش وصلني",
            style: "destructive",
            onPress: () => handleReject(order.id),
          },
          {
            text: "أيوه استلمته ✓",
            onPress: () => handleConfirm(order.id),
          },
        ],
        { cancelable: false }
      );
    }

    // Update tracked IDs
    prevDeliveredIds.current = new Set(deliveredOrders.map((o) => o.id));
  }, [orders]);

  const handleConfirm = async (id: string) => {
    try {
      await confirmMutation.mutateAsync({ id });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
    } catch {
      Alert.alert("خطأ", "مش قدر يأكد الاستلام");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync({ id });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
    } catch {
      Alert.alert("خطأ", "مش قدر يرفض الطلب");
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const isDelivered = item.status === "delivered";

    return (
      <View style={[styles.card, isDelivered && styles.cardDelivered]}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>{item.menuItemNameAr}</Text>
          <View style={[styles.badge, item.status === "pending" && item.urgentAt ? styles.badgeUrgent : statusBadgeStyle(item.status)]}>
            <Text style={[styles.badgeText, (isDelivered || (item.status === "pending" && !!item.urgentAt)) && styles.badgeTextDelivered]}>
              {item.status === "pending" && item.urgentAt ? "مستعجل" : statusLabel(item.status)}
            </Text>
          </View>
        </View>

        {item.notes ? <Text style={styles.notes}>ملاحظة: {item.notes}</Text> : null}

        <Text style={styles.time}>
          {item.status === "completed" && item.completedAt
            ? `وصل الساعة ${formatTime(item.completedAt)}`
            : `طلبته الساعة ${formatTime(item.createdAt)}`}
        </Text>

        {item.status === "pending" && (
          item.urgentAt ? <Text style={styles.urgentText}>طلب مستعجل — تم إرسال طلب الاستعجال</Text> : (
            <Pressable style={styles.urgentButton} testID={`expedite-${item.id}`}
              onPress={() => handleExpedite(item.id)} disabled={expediteMutation.isPending || cancelMutation.isPending} accessibilityRole="button">
              <Text style={styles.urgentText}>{expediteMutation.isPending && expediteMutation.variables?.id === item.id ? "جارٍ الإرسال…" : "استعجال الطلب وتنبيه العامل"}</Text>
            </Pressable>
          )
        )}

        {item.status === "pending" && (
          cancelTarget === item.id ? <View style={styles.cancelConfirmation}>
            <Text style={styles.cancelText}>تأكيد إلغاء الطلب؟ لن يظهر للعامل في قائمة الانتظار.</Text>
            <View style={styles.actionBtns}>
              <Pressable testID={`keep-order-${item.id}`} accessibilityRole="button"
                disabled={cancelMutation.isPending} style={styles.urgentButton} onPress={() => setCancelTarget(null)}>
                <Text style={styles.urgentText}>رجوع بدون إلغاء</Text>
              </Pressable>
              <Pressable testID={`confirm-cancel-${item.id}`} accessibilityRole="button" style={styles.cancelButton}
                disabled={cancelMutation.isPending || expediteMutation.isPending} onPress={() => handleCancel(item.id)}>
                <Text style={styles.cancelText}>{cancelMutation.isPending ? "جارٍ الإلغاء…" : "تأكيد الإلغاء"}</Text>
              </Pressable>
            </View>
          </View> : <Pressable testID={`cancel-order-${item.id}`} accessibilityRole="button" style={styles.cancelButton}
            disabled={cancelMutation.isPending || expediteMutation.isPending}
            onPress={() => { setCancelError(null); setCancelTarget(item.id); }}>
            <Text style={styles.cancelText}>إلغاء الطلب</Text>
          </Pressable>
        )}
        {cancelError?.id === item.id ? <Text accessibilityRole="alert" style={styles.cancelText}>{cancelError.message}</Text> : null}

        {isDelivered && (
          <View style={styles.actionRow}>
            <Text style={styles.actionPrompt}>هل استلمت طلبك؟</Text>
            <View style={styles.actionBtns}>
              <Pressable
                style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8 }]}
                onPress={() => handleReject(item.id)}
                disabled={rejectMutation.isPending || confirmMutation.isPending}
              >
                <Text style={styles.rejectBtnText}>لأ ✕</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.8 }]}
                onPress={() => handleConfirm(item.id)}
                disabled={confirmMutation.isPending || rejectMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>أيوه ✓</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <Text style={styles.title}>طلباتي</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={orders || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Platform.OS === "web" ? 100 : 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>مفيش طلبات لسه</Text>
              <Text style={styles.emptySubText}>اطلب من تبويب اطلب</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.light.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeCancelled: { backgroundColor: colors.light.secondary },
  cancelConfirmation: { paddingTop: 12, gap: 8 },
  cancelButton: { marginTop: 10, padding: 10, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.light.destructive },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.light.destructive, textAlign: "center" },
  urgentButton: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.light.destructive, marginTop: 8 },
  urgentText: { fontFamily: "Inter_600SemiBold", color: colors.light.destructive, fontSize: 13, textAlign: "right", marginTop: 4 },
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardDelivered: {
    borderWidth: 2,
    borderColor: colors.light.primary,
    backgroundColor: "#FFFBF0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeDone: { backgroundColor: "#E8F5E9" },
  badgePending: { backgroundColor: "#FFF3E0" },
  badgeDelivered: { backgroundColor: colors.light.primary },
  badgeUrgent: { backgroundColor: colors.light.destructive },
  badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  badgeTextDelivered: { color: "#fff" },
  notes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 4,
  },
  time: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  actionRow: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 12,
    gap: 10,
  },
  actionPrompt: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    textAlign: "center",
  },
  actionBtns: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  rejectBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#D32F2F" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.light.success,
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  emptySubText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
});
