import { getGetDailyStatsQueryKey, useGetDailyStats } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const { data: stats, isLoading, refetch, isRefetching } = useGetDailyStats({
    query: { queryKey: getGetDailyStatsQueryKey(), refetchInterval: 30000 },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 120 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.light.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>إحصائيات اليوم</Text>
      {stats && <Text style={styles.dateText}>{formatDate(stats.date)}</Text>}

      {stats && (
        <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderTopColor: colors.light.primary }]}>
              <Text style={styles.summaryNum}>{stats.totalOrders}</Text>
              <Text style={styles.summaryLabel}>إجمالي الطلبات</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: colors.light.success }]}>
              <Text style={[styles.summaryNum, { color: colors.light.success }]}>{stats.completedOrders}</Text>
              <Text style={styles.summaryLabel}>وصّل</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: colors.light.pending }]}>
              <Text style={[styles.summaryNum, { color: colors.light.pending }]}>{stats.pendingOrders}</Text>
              <Text style={styles.summaryLabel}>في الانتظار</Text>
            </View>
          </View>

          {stats.byItem.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الأكثر طلباً</Text>
              {stats.byItem
                .sort((a, b) => b.count - a.count)
                .map((item) => (
                  <View key={item.menuItemId} style={styles.itemRow}>
                    <Text style={styles.itemRowName}>{item.menuItemNameAr}</Text>
                    <View style={styles.itemRowRight}>
                      <View style={[styles.barFill, { width: Math.max(40, (item.count / stats.totalOrders) * 100) }]} />
                      <Text style={styles.itemRowCount}>{item.count}</Text>
                    </View>
                  </View>
                ))}
            </View>
          )}

          {stats.byUser.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>بالتفصيل لكل شخص</Text>
              {stats.byUser
                .sort((a, b) => b.totalOrders - a.totalOrders)
                .map((u) => (
                  <View key={u.userId} style={styles.userCard}>
                    <View style={styles.userCardHeader}>
                      <Text style={styles.userName}>{u.displayName}</Text>
                      <Text style={styles.userTotal}>{u.totalOrders} طلب</Text>
                    </View>
                    <View style={styles.userItems}>
                      {u.items.map((item) => (
                        <View key={item.menuItemId} style={styles.userItem}>
                          <Text style={styles.userItemName}>{item.menuItemNameAr}</Text>
                          <View style={styles.userItemCount}>
                            <Text style={styles.userItemCountText}>{item.count}×</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
            </View>
          )}

          {stats.totalOrders === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>مفيش طلبات النهارده لسه</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 14,
    alignItems: "center",
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  summaryNum: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.light.primary },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground, marginTop: 4, textAlign: "center" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  itemRowName: { fontSize: 16, fontFamily: "Inter_500Medium", color: colors.light.foreground, flex: 1 },
  itemRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  barFill: { height: 8, backgroundColor: colors.light.accent, borderRadius: 4 },
  itemRowCount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.light.primary,
    minWidth: 28,
    textAlign: "right",
  },
  userCard: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  userCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  userName: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  userTotal: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.primary,
    backgroundColor: colors.light.secondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  userItems: { gap: 6 },
  userItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userItemName: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.light.foreground },
  userItemCount: {
    backgroundColor: colors.light.secondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  userItemCountText: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.light.primary },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground },
});
