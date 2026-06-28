import { useGetOrders } from "@workspace/api-client-react";
import React from "react";
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
import colors from "@/constants/colors";

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export default function MyOrdersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const { data: orders, isLoading, refetch, isRefetching } = useGetOrders(
    { mine: true, status: "all" },
    { query: { refetchInterval: 10000 } }
  );

  const renderItem = ({ item }: { item: NonNullable<typeof orders>[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemName}>{item.menuItemNameAr}</Text>
        <View style={[styles.badge, item.status === "completed" ? styles.badgeDone : styles.badgePending]}>
          <Text style={styles.badgeText}>{item.status === "completed" ? "وصل ✓" : "في الانتظار"}</Text>
        </View>
      </View>
      {item.notes ? <Text style={styles.notes}>ملاحظة: {item.notes}</Text> : null}
      <Text style={styles.time}>
        {item.status === "completed" && item.completedAt
          ? `وصل الساعة ${formatTime(item.completedAt)}`
          : `طلبته الساعة ${formatTime(item.createdAt)}`}
      </Text>
    </View>
  );

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
  badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  notes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 4,
  },
  time: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  emptySubText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
});
