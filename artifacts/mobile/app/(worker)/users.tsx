import {
  getGetAdminUsersQueryKey,
  getGetProjectsQueryKey,
  useCreateProject,
  useCreateWorker,
  useGetAdminUsers,
  useGetProjects,
  useUpdateUserRole,
  useUpdateWorker,
} from "@workspace/api-client-react";
import type { AdminUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useGetAdminUsers();
  const { data: projects } = useGetProjects();
  const createProject = useCreateProject();
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const updateRole = useUpdateUserRole();

  const [projectName, setProjectName] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerUsername, setWorkerUsername] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [workerProjectId, setWorkerProjectId] = useState("");
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!workerProjectId && projects?.[0]) setWorkerProjectId(projects[0].id);
  }, [projects, workerProjectId]);

  if (user?.role !== "admin") {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Text style={styles.denied}>هذه الصفحة متاحة للمدير فقط</Text>
      </View>
    );
  }

  const refreshUsers = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });

  const handleAddProject = async () => {
    const name = projectName.trim();
    if (name.length < 2) return Alert.alert("تنبيه", "اكتب اسم المشروع");
    try {
      await createProject.mutateAsync({ data: { name } });
      setProjectName("");
      queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() });
    } catch {
      Alert.alert("خطأ", "المشروع موجود أو تعذر إضافته");
    }
  };

  const shareWorkerCredentials = async (displayName: string, username: string, password: string, project: string) => {
    await Share.share({
      message: `بيانات دخول عامل البوفيه\nالاسم: ${displayName}\nالمشروع: ${project}\nاسم المستخدم: ${username}\nكلمة المرور: ${password}`,
    });
  };

  const handleCreateWorker = async () => {
    const displayName = workerName.trim();
    const username = workerUsername.trim().toLowerCase();
    const password = workerPassword;
    if (!displayName || !username || !workerProjectId || password.length < 8) {
      Alert.alert("بيانات ناقصة", "أدخل الاسم واسم المستخدم والمشروع وكلمة مرور من 8 أحرف");
      return;
    }
    try {
      const created = await createWorker.mutateAsync({
        data: { displayName, username, password, projectId: workerProjectId },
      });
      await refreshUsers();
      setWorkerName("");
      setWorkerUsername("");
      setWorkerPassword("");
      Alert.alert(
        "تم إنشاء العامل",
        `اسم المستخدم: ${username}\nكلمة المرور: ${password}`,
        [
          { text: "إغلاق" },
          {
            text: "مشاركة البيانات",
            onPress: () => void shareWorkerCredentials(
              displayName,
              username,
              password,
              created.projectName || "",
            ),
          },
        ],
      );
    } catch {
      Alert.alert("خطأ", "اسم المستخدم موجود أو البيانات غير صحيحة");
    }
  };

  const changeWorker = async (
    worker: AdminUser,
    data: { password?: string; projectId?: string; isActive?: boolean },
  ) => {
    try {
      await updateWorker.mutateAsync({ id: worker.id, data });
      setNewPasswords((current) => ({ ...current, [worker.id]: "" }));
      await refreshUsers();
    } catch {
      Alert.alert("خطأ", "تعذر تعديل حساب العامل");
    }
  };

  const changeRole = async (account: AdminUser, role: "customer" | "admin") => {
    try {
      await updateRole.mutateAsync({ id: account.id, data: { role } });
      await refreshUsers();
    } catch {
      Alert.alert("خطأ", "تعذر تغيير الصلاحية");
    }
  };

  const header = (
    <View style={styles.headerContent}>
      <Text style={styles.title}>إدارة التطبيق</Text>

      <Text style={styles.sectionTitle}>المشاريع</Text>
      <View style={styles.row}>
        <Pressable style={styles.primaryButton} onPress={handleAddProject}>
          <Text style={styles.primaryText}>إضافة</Text>
        </Pressable>
        <TextInput value={projectName} onChangeText={setProjectName} placeholder="اسم مشروع جديد" style={styles.input} textAlign="right" />
      </View>

      <Text style={styles.sectionTitle}>إضافة عامل بوفيه</Text>
      <Text style={styles.helper}>اختر مشروع العامل، ثم أرسل له اسم المستخدم وكلمة المرور بعد الإنشاء.</Text>
      <TextInput value={workerName} onChangeText={setWorkerName} placeholder="اسم العامل" style={styles.input} textAlign="right" />
      <TextInput value={workerUsername} onChangeText={setWorkerUsername} placeholder="اسم المستخدم" autoCapitalize="none" style={styles.input} textAlign="right" />
      <TextInput value={workerPassword} onChangeText={setWorkerPassword} placeholder="كلمة مرور من 8 أحرف" secureTextEntry style={styles.input} textAlign="right" />
      <View style={styles.projectList}>
        {(projects || []).map((project) => (
          <Pressable
            key={project.id}
            onPress={() => setWorkerProjectId(project.id)}
            style={[styles.projectChip, workerProjectId === project.id && styles.projectChipActive]}
          >
            <Text style={[styles.projectChipText, workerProjectId === project.id && styles.projectChipTextActive]}>{project.name}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.createWorkerButton} onPress={handleCreateWorker}>
        <Text style={styles.primaryText}>إنشاء حساب العامل</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>الحسابات</Text>
      <Text style={styles.helper}>كلمات المرور لا تظهر في القائمة. يمكن تغيير كلمة مرور العامل فقط بكتابة كلمة جديدة.</Text>
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
            <View style={[styles.card, !item.isActive && styles.inactiveCard]}>
              <View>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.username}>@{item.username}</Text>
                <Text style={styles.badge}>
                  {item.role === "worker" ? `عامل بوفيه — ${item.projectName || "بدون مشروع"}` : item.role === "admin" ? "أدمن" : "مستخدم"}
                </Text>
              </View>

              {item.role === "worker" ? (
                <View style={styles.workerControls}>
                  <View style={styles.projectList}>
                    {(projects || []).map((project) => (
                      <Pressable
                        key={project.id}
                        onPress={() => changeWorker(item, { projectId: project.id })}
                        style={[styles.smallChip, item.projectId === project.id && styles.projectChipActive]}
                      >
                        <Text style={[styles.smallChipText, item.projectId === project.id && styles.projectChipTextActive]}>{project.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.row}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        const password = newPasswords[item.id] || "";
                        if (password.length < 8) return Alert.alert("تنبيه", "اكتب كلمة مرور جديدة من 8 أحرف");
                        void changeWorker(item, { password });
                      }}
                    >
                      <Text style={styles.secondaryText}>تغيير</Text>
                    </Pressable>
                    <TextInput
                      value={newPasswords[item.id] || ""}
                      onChangeText={(value) => setNewPasswords((current) => ({ ...current, [item.id]: value }))}
                      placeholder="كلمة مرور جديدة"
                      secureTextEntry
                      style={styles.input}
                      textAlign="right"
                    />
                  </View>
                  <Pressable
                    onPress={() => changeWorker(item, { isActive: !item.isActive })}
                    style={[styles.statusButton, item.isActive ? styles.disableButton : styles.enableButton]}
                  >
                    <Text style={styles.statusText}>{item.isActive ? "إلغاء حساب العامل" : "إعادة تفعيل العامل"}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.roleRow}>
                  <Pressable
                    disabled={item.id === "admin"}
                    onPress={() => changeRole(item, "customer")}
                    style={[styles.roleButton, item.role === "customer" && styles.roleButtonActive]}
                  >
                    <Text style={[styles.roleText, item.role === "customer" && styles.activeText]}>مستخدم</Text>
                  </Pressable>
                  <Pressable onPress={() => changeRole(item, "admin")} style={[styles.roleButton, item.role === "admin" && styles.roleButtonActive]}>
                    <Text style={[styles.roleText, item.role === "admin" && styles.activeText]}>أدمن</Text>
                  </Pressable>
                </View>
              )}
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
  headerContent: { gap: 10, marginBottom: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.light.foreground, textAlign: "right" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.light.foreground, textAlign: "right", marginTop: 10 },
  helper: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, textAlign: "right" },
  row: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.light.border, borderRadius: 10, padding: 12, backgroundColor: colors.light.card },
  primaryButton: { backgroundColor: colors.light.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: "center" },
  createWorkerButton: { backgroundColor: colors.light.primary, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold" },
  projectList: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "flex-end" },
  projectChip: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  projectChipActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  projectChipText: { color: colors.light.foreground, fontFamily: "Inter_600SemiBold" },
  projectChipTextActive: { color: "#fff" },
  card: { backgroundColor: colors.light.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.light.border, gap: 12 },
  inactiveCard: { opacity: 0.6 },
  name: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.light.foreground, textAlign: "right" },
  username: { fontSize: 13, color: colors.light.mutedForeground, textAlign: "right" },
  badge: { marginTop: 5, fontSize: 12, color: colors.light.primary, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  workerControls: { gap: 9 },
  smallChip: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 6 },
  smallChipText: { fontSize: 11, color: colors.light.foreground, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { borderWidth: 1, borderColor: colors.light.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  secondaryText: { color: colors.light.primary, fontFamily: "Inter_700Bold" },
  statusButton: { borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  disableButton: { backgroundColor: "#b91c1c" },
  enableButton: { backgroundColor: "#15803d" },
  statusText: { color: "#fff", fontFamily: "Inter_700Bold" },
  roleRow: { flexDirection: "row", gap: 7 },
  roleButton: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.light.border },
  roleButtonActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  roleText: { fontFamily: "Inter_600SemiBold", color: colors.light.mutedForeground },
  activeText: { color: "#fff" },
});