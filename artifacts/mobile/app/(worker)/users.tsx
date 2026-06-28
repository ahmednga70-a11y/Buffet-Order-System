import React, { useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";

interface UserRecord {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: "customer" | "worker";
}

function useUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetch_ = async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true); else setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as UserRecord[];
      setUsers(data);
    } catch {}
    setIsLoading(false);
    setIsRefreshing(false);
  };

  React.useEffect(() => { fetch_(); }, []);

  return { users, isLoading, isRefreshing, refetch: () => fetch_(true) };
}

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const { users, isLoading, isRefreshing, refetch } = useUsers();

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderItem = ({ item }: { item: UserRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName.slice(0, 1)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.displayName}>{item.displayName}</Text>
          <View style={styles.roleBadgeRow}>
            <View style={[styles.roleBadge, item.role === "worker" ? styles.roleBadgeWorker : styles.roleBadgeCustomer]}>
              <Text style={styles.roleBadgeText}>{item.role === "worker" ? "عامل بوفيه" : "موظف"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.credRow}>
        <View style={styles.credItem}>
          <Text style={styles.credLabel}>اسم المستخدم</Text>
          <Text style={styles.credValue}>{item.username}</Text>
        </View>
        <View style={styles.credItem}>
          <Text style={styles.credLabel}>كلمة المرور</Text>
          <View style={styles.passRow}>
            <Text style={styles.credValue}>
              {visiblePasswords[item.id] ? item.password : "••••••••"}
            </Text>
            <Pressable onPress={() => togglePassword(item.id)} style={styles.eyeBtn}>
              <Feather
                name={visiblePasswords[item.id] ? "eye-off" : "eye"}
                size={16}
                color={colors.light.mutedForeground}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <Text style={styles.title}>المستخدمون</Text>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Platform.OS === "web" ? 100 : 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyText}>مفيش مستخدمين</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={colors.light.primary} />
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
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.light.primary },
  cardInfo: { flex: 1, gap: 4 },
  displayName: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  roleBadgeRow: { flexDirection: "row" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  roleBadgeWorker: { backgroundColor: "#FFF3E0" },
  roleBadgeCustomer: { backgroundColor: "#E3F2FD" },
  roleBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  credRow: { flexDirection: "row", gap: 12 },
  credItem: { flex: 1, gap: 4 },
  credLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground },
  credValue: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  passRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyeBtn: { padding: 4 },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground },
});
