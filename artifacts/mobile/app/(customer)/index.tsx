import { useCreateOrder, useGetMenuItems } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { getGetOrdersQueryKey } from "@workspace/api-client-react";

const CATEGORY_LABELS: Record<string, string> = {
  hot: "مشروبات ساخنة",
  cold: "مشروبات باردة",
  juice: "عصائر",
  other: "أخرى",
};

const CATEGORY_ORDER = ["hot", "cold", "juice", "other"];

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { data: menuItems, isLoading: menuLoading } = useGetMenuItems();
  const createOrderMutation = useCreateOrder();

  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [orderSent, setOrderSent] = useState(false);

  const groupedMenu = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: (menuItems || []).filter((m) => m.category === cat),
  })).filter((g) => g.items.length > 0);

  const handleOrder = async () => {
    if (!selected) {
      Alert.alert("اختار أولاً", "اختار المشروب اللي عاوزه");
      return;
    }
    try {
      await createOrderMutation.mutateAsync({ data: { menuItemId: selected, notes: notes.trim() || undefined } });
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOrderSent(true);
      setSelected(null);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      setTimeout(() => setOrderSent(false), 3000);
    } catch {
      Alert.alert("خطأ", "مش قدر يبعت الطلب، حاول تاني");
    }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (menuLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.light.background }]}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>أهلاً، {user?.displayName} 👋</Text>
          <Text style={styles.headerSub}>عاوز إيه النهارده؟</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>خروج</Text>
        </Pressable>
      </View>

      {orderSent && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓ طلبك اتبعت! هيوصلك قريباً</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 120 }}
        showsVerticalScrollIndicator={false}
      >
        {groupedMenu.map((group) => (
          <View key={group.category} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.label}</Text>
            <View style={styles.itemsGrid}>
              {group.items.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.menuItem,
                    selected === item.id && styles.menuItemSelected,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    setSelected(item.id === selected ? null : item.id);
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.menuItemIcon}>
                    {item.category === "hot" ? "☕" : item.category === "juice" ? "🥤" : "💧"}
                  </Text>
                  <Text style={[styles.menuItemName, selected === item.id && styles.menuItemNameSelected]}>
                    {item.nameAr}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>ملاحظات (اختياري)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="مثلاً: سكر تقيل، بدون سكر..."
            placeholderTextColor={colors.light.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.orderBtn, !selected && styles.orderBtnDisabled, pressed && { opacity: 0.85 }]}
          onPress={handleOrder}
          disabled={!selected || createOrderMutation.isPending}
        >
          {createOrderMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.orderBtnText}>
              {selected ? `اطلب ${(menuItems || []).find((m) => m.id === selected)?.nameAr || ""}` : "اختار مشروب أولاً"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, marginTop: 2 },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.light.secondary },
  logoutText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.light.primary },
  successBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.light.success,
    borderRadius: colors.radius,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  successText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15, textAlign: "center" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 12,
  },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  menuItem: {
    width: "47%",
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.light.border,
    gap: 8,
  },
  menuItemSelected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.secondary,
  },
  menuItemIcon: { fontSize: 32 },
  menuItemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    textAlign: "center",
  },
  menuItemNameSelected: { color: colors.light.primary },
  notesSection: { paddingHorizontal: 20, marginBottom: 20 },
  notesInput: {
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    backgroundColor: colors.light.card,
    minHeight: 80,
    textAlignVertical: "top",
  },
  orderBtn: {
    marginHorizontal: 20,
    backgroundColor: colors.light.primary,
    borderRadius: colors.radius,
    paddingVertical: 18,
    alignItems: "center",
  },
  orderBtnDisabled: { backgroundColor: colors.light.muted },
  orderBtnText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
});
