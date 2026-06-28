import { useGetOrders, getGetOrdersQueryKey } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export default function CompletedScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const { data: orders, isLoading, refetch, isRefetching } = useGetOrders(
    { status: "completed" },
    { query: { refetchInterval: 15000, queryKey: getGetOrdersQueryKey({ status: "completed" }) } }
  );

  const renderItem = ({ item }: { item: NonNullable<typeof orders>[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.personName}>{item.userDisplayName}</Text>
        <Text style={styles.doneBadge}>وصّل ✓</Text>
      </View>
      <Text style={styles.itemName}>{item.menuItemNameAr}</Text>
      {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}
      <Text style={styles.time}>
        طُلب {formatTime(item.createdAt)}
        {item.completedAt ? ` · وصّل ${formatTime(item.completedAt)}` : ""}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <Text style={styles.title}>الطلبات المنجزة</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={orders || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Platform.OS === "web" ? 100 : 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>مفيش طلبات منجزة لسه</Text>
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.success,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  personName: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  doneBadge: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.light.success },
  itemName: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.light.primary, marginBottom: 4 },
  notes: { fontSize: 13, color: colors.light.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 2 },
  time: { fontSize: 12, color: colors.light.mutedForeground, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", marginTop: 100, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
});
