import { useLogin } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const loginMutation = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("خطأ", "من فضلك أدخل اسم المستخدم وكلمة المرور");
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({ data: { username: username.trim(), password } });
      await login(result.user as { id: string; username: string; displayName: string; role: "customer" | "worker" }, result.token);
    } catch {
      Alert.alert("خطأ", "اسم المستخدم أو كلمة المرور غلط");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.light.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>☕</Text>
          </View>
          <Text style={styles.title}>بوفيه الشركة</Text>
          <Text style={styles.subtitle}>سجل دخولك لتقدر تطلب</Text>
        </View>

        <View style={styles.form}>
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
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور</Text>
            <TextInput
              style={styles.input}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor={colors.light.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

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

          <Pressable style={styles.registerLink} onPress={() => router.push("/register")}>
            <Text style={styles.registerLinkText}>مش عندك حساب؟ سجل هنا</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
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
    textAlign: "right",
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
