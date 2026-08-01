import {
  useGetOrders,
  useConfirmOrder,
  useRejectOrder,
  getGetOrdersQueryKey,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
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
  return status;
}

function statusBadgeStyle(status: string) {
  if (status === "completed") return styles.badgeDone;
  if (status === "delivered") return styles.badgeDelivered;
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
          <View style={[styles.badge, statusBadgeStyle(item.status)]}>
            <Text style={[styles.badgeText, isDelivered && styles.badgeTextDelivered]}>
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        {item.notes ? <Text style={styles.notes}>ملاحظة: {item.notes}</Text> : null}

        <Text style={styles.time}>
          {item.status === "completed" && item.completedAt
            ? `وصل الساعة ${formatTime(item.completedAt)}`
            : `طلبته الساعة ${formatTime(item.createdAt)}`}
        </Text>

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
