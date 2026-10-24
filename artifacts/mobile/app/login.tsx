import { useGetProjects, useLogin } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { ProjectSelector } from "@/components/ProjectSelector";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, user, isLoading: restoringSession } = useAuth();
  const loginMutation = useLogin();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { data: projects, isLoading: projectsLoading } = useGetProjects();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [projectId, setProjectId] = useState(params.projectId ?? "");

  useEffect(() => {
    if (!projectId && projects?.[0]) setProjectId(projects[0].id);
  }, [projectId, projects]);

  const handleLogin = async () => {
    setLoginError("");
    if (!projectId || !username.trim() || !password.trim()) {
      setLoginError("من فضلك اختر المشروع وأدخل بيانات الدخول");
      Alert.alert("خطأ", "من فضلك اختر المشروع وأدخل بيانات الدخول");
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({ data: { username: username.trim(), password, projectId, rememberMe } });
      const authUser = result.user;
      await login(authUser, result.token, rememberMe);
      router.replace(authUser.role === "customer" ? "/(customer)" : "/(worker)");
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;
      const message = status === 401 ? "اسم المستخدم أو كلمة المرور غلط"
        : status === 403 ? "الحساب موقوف أو غير مسموح له بالمشروع ده"
        : "تعذّر تسجيل الدخول. تحقق من الاتصال والسماح بتخزين بيانات الموقع ثم حاول مرة أخرى.";
      setLoginError(message);
      Alert.alert("خطأ", message);
    }
  };

  if (restoringSession) return <ActivityIndicator style={{ flex: 1 }} color={colors.light.primary} />;
  if (user) return <Redirect href="/" />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.light.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 34 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>☕</Text>
          </View>
          <Text style={styles.title}>بوفيه الشركة</Text>
          <Text style={styles.subtitle}>سجل دخولك لتقدر تطلب</Text>
        </View>

        <View style={styles.form}>
          <ProjectSelector
            projects={projects}
            selectedId={projectId}
            onSelect={setProjectId}
            loading={projectsLoading}
          />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المستخدم</Text>
            <TextInput
              style={styles.input}
              placeholder="أدخل اسم المستخدم"
              placeholderTextColor={colors.light.mutedForeground}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="أدخل كلمة المرور"
                placeholderTextColor={colors.light.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={colors.light.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
            accessibilityLabel="تذكرني على هذا الجهاز"
            aria-checked={rememberMe}
            testID="remember-me"
            onPress={() => setRememberMe((value) => !value)}
            style={styles.rememberRow}
          >
            <Feather name={rememberMe ? "check-square" : "square"} size={22} color={colors.light.primary} />
            <View>
              <Text style={styles.rememberText}>تذكرني على هذا الجهاز</Text>
              <Text style={styles.rememberHint}>دخول محفوظ 30 يوم — لا تستخدمه على جهاز مشترك</Text>
            </View>
          </Pressable>
          {loginError ? <Text accessibilityRole="alert" style={styles.loginError}>{loginError}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>دخول</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.registerLink}
            onPress={() => router.push({ pathname: "/register", params: { projectId } })}
          >
            <Text style={styles.registerLinkText}>مش عندك حساب؟ سجل هنا</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loginError: { fontFamily: "Inter_500Medium", fontSize: 13, color: colors.light.destructive, textAlign: "right" },
  rememberRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 8 },
  rememberText: { fontFamily: "Inter_500Medium", fontSize: 14, color: colors.light.foreground, textAlign: "right" },
  rememberHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.light.mutedForeground, textAlign: "right" },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 48 },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.light.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconText: { fontSize: 44 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.light.foreground, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  input: {
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    backgroundColor: colors.light.card,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  passwordInput: { flex: 1 },
  eyeBtn: {
    width: 48,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    backgroundColor: colors.light.card,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: colors.radius,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  loginBtnText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  registerLink: { alignItems: "center", paddingVertical: 12 },
  registerLinkText: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.light.primary },
});
