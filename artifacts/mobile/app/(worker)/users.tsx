import {
  getGetAdminUsersQueryKey,
  getGetProjectsQueryKey,
  useCreateProject,
  useGetAdminUsers,
  useGetProjects,
  useUpdateUserRole,
} from "@workspace/api-client-react";
import type { AdminUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";

const roles: Array<{ value: AdminUser["role"]; label: string }> = [
  { value: "customer", label: "مستخدم" },
  { value: "worker", label: "عامل بوفيه" },
  { value: "admin", label: "أدمن" },
];

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [projectName, setProjectName] = useState("");
  const { data: users, isLoading } = useGetAdminUsers();
  const { data: projects } = useGetProjects();
  const createProject = useCreateProject();
  const updateRole = useUpdateUserRole();

  if (user?.role !== "admin") {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Text style={styles.denied}>هذه الصفحة متاحة للمدير فقط</Text>
      </View>
    );
  }

  const handleAddProject = async () => {
    const name = projectName.trim();
    if (name.length < 2) {
      Alert.alert("تنبيه", "اكتب اسم المشروع");
      return;
    }
    try {
      await createProject.mutateAsync({ data: { name } });
      setProjectName("");
      queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() });
    } catch {
      Alert.alert("خطأ", "المشروع موجود أو تعذر إضافته");
    }
  };

  const handleRole = async (id: string, role: AdminUser["role"]) => {
    try {
      await updateRole.mutateAsync({ id, data: { role } });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
    } catch {
      Alert.alert("خطأ", "تعذر تغيير الصلاحية");
    }
  };

  const header = (
    <View style={styles.headerContent}>
      <Text style={styles.title}>إدارة التطبيق</Text>
      <Text style={styles.sectionTitle}>المشاريع</Text>
      <View style={styles.projectInputRow}>
        <Pressable style={styles.addButton} onPress={handleAddProject}>
          <Text style={styles.addButtonText}>إضافة</Text>
        </Pressable>
        <TextInput
          value={projectName}
          onChangeText={setProjectName}
          placeholder="اسم مشروع جديد"
          placeholderTextColor={colors.light.mutedForeground}
          style={styles.input}
          textAlign="right"
        />
      </View>
      <View style={styles.projectList}>
        {(projects || []).map((project) => (
          <View key={project.id} style={styles.projectChip}>
            <Text style={styles.projectChipText}>{project.name}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sectionTitle}>المستخدمون والصلاحيات</Text>
      <Text style={styles.helper}>كلمات المرور لا تظهر لأي شخص، حتى المدير.</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>
      ) : (
        <FlatList
          data={users || []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
              <View style={styles.roles}>
                {roles.map((role) => {
                  const active = item.role === role.value;
                  const locked = item.id === "admin" && role.value !== "admin";
                  return (
                    <Pressable
                      key={role.value}
                      disabled={locked || updateRole.isPending}
                      onPress={() => handleRole(item.id, role.value)}
                      style={[styles.roleButton, active && styles.roleButtonActive, locked && styles.disabled]}
                    >
                      <Text style={[styles.roleText, active && styles.roleTextActive]}>{role.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.light.background },
  denied: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.light.mutedForeground },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  headerContent: { gap: 12, marginBottom: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.light.foreground, textAlign: "right" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.light.foreground, textAlign: "right", marginTop: 8 },
  helper: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, textAlign: "right" },
  projectInputRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.light.border, borderRadius: 10, padding: 12, backgroundColor: colors.light.card },
  addButton: { backgroundColor: colors.light.primary, borderRadius: 10, paddingHorizontal: 20, justifyContent: "center" },
  addButtonText: { color: "#fff", fontFamily: "Inter_700Bold" },
  projectList: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  projectChip: { backgroundColor: colors.light.secondary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  projectChipText: { color: colors.light.primary, fontFamily: "Inter_600SemiBold" },
  card: { backgroundColor: colors.light.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.light.border, gap: 12 },
  name: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.light.foreground, textAlign: "right" },
  username: { fontSize: 13, color: colors.light.mutedForeground, textAlign: "right" },
  roles: { flexDirection: "row", gap: 6 },
  roleButton: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.light.border },
  roleButtonActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.light.mutedForeground },
  roleTextActive: { color: "#fff" },
  disabled: { opacity: 0.35 },
});