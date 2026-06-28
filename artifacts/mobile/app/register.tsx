import { useRegister } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const registerMutation = useRegister();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"customer" | "worker">("customer");

  const handleRegister = async () => {
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert("خطأ", "من فضلك أدخل كل البيانات");
      return;
    }
    if (password.length < 4) {
      Alert.alert("خطأ", "كلمة المرور لازم تكون 4 حروف على الأقل");
      return;
    }

    try {
      const result = await registerMutation.mutateAsync({
        data: { username: username.trim(), password, displayName: displayName.trim(), role },
      });
      await login(result.user as { id: string; username: string; displayName: string; role: "customer" | "worker" }, result.token);
    } catch (err: unknown) {
      const message = (err as { data?: { error?: string } })?.data?.error || "حصل خطأ، حاول تاني";
      Alert.alert("خطأ", message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.light.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </Pressable>
          <Text style={styles.title}>حساب جديد</Text>
          <Text style={styles.subtitle}>أنشئ حسابك في بوفيه الشركة</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسمك</Text>
            <TextInput
              style={styles.input}
              placeholder="اسمك الكامل"
              placeholderTextColor={colors.light.mutedForeground}
              value={displayName}
              onChangeText={setDisplayName}
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المستخدم</Text>
            <TextInput
              style={styles.input}
              placeholder="اختار اسم مستخدم"
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
            <TextInput
              style={styles.input}
              placeholder="كلمة مرور قوية"
              placeholderTextColor={colors.light.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>أنت</Text>
            <View style={styles.roleRow}>
              <Pressable
                style={[styles.roleBtn, role === "customer" && styles.roleBtnActive]}
                onPress={() => setRole("customer")}
              >
                <Text style={[styles.roleBtnText, role === "customer" && styles.roleBtnTextActive]}>
                  موظف (طالب)
                </Text>
              </Pressable>
              <Pressable
                style={[styles.roleBtn, role === "worker" && styles.roleBtnActive]}
                onPress={() => setRole("worker")}
              >
                <Text style={[styles.roleBtnText, role === "worker" && styles.roleBtnTextActive]}>
                  عامل بوفيه
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.registerBtn, pressed && { opacity: 0.85 }]}
            onPress={handleRegister}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>إنشاء الحساب</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  header: { marginBottom: 36 },
  backBtn: { marginBottom: 20 },
  backBtnText: { fontSize: 16, color: colors.light.primary, fontFamily: "Inter_500Medium" },
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
  roleRow: { flexDirection: "row", gap: 12 },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.light.card,
  },
  roleBtnActive: { borderColor: colors.light.primary, backgroundColor: colors.light.secondary },
  roleBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground },
  roleBtnTextActive: { color: colors.light.primary, fontFamily: "Inter_600SemiBold" },
  registerBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: colors.radius,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  registerBtnText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
});
