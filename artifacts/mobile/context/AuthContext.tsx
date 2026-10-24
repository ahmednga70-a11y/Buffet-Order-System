import { getCurrentUser, setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import Constants from "expo-constants";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { clearSession, readSession, saveSession } from "@/utils/sessionStorage";
import { disablePushDevice } from "@/utils/pushDevice";

// Module-level token — the getter is registered once and always reads from here
let _token: string | null = null;

setAuthTokenGetter(() => _token);

// Production APKs use the published API URL. Development builds keep using
// the Replit domain when EXPO_PUBLIC_API_URL is not provided.
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? null;
setBaseUrl(apiBaseUrl);

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: "customer" | "worker" | "admin";
  projectId: string;
  projectName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (user: AuthUser, token: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await readSession();
        if (saved?.token && saved.user?.id) {
          _token = saved.token;
          try {
            const currentUser = await getCurrentUser();
            setToken(saved.token);
            setUser(currentUser);
          } catch (error: unknown) {
            const status = (error as { status?: number }).status;
            if (status === 401 || status === 403) {
              _token = null;
              await clearSession();
            } else {
              // A network outage is not a logout. Protected API calls still
              // validate the saved token and active account on the server.
              setToken(saved.token);
              setUser(saved.user);
            }
          }
        }
      } catch {
        _token = null;
        await clearSession().catch(() => {});
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (authUser: AuthUser, authToken: string, remember = true) => {
    await saveSession({ user: authUser, token: authToken }, remember);
    _token = authToken;                  // set module-level first
    queryClient.clear();
    setToken(authToken);
    setUser(authUser);
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await disablePushDevice();
    } catch {
      Alert.alert("تعذّر الخروج بأمان", "اتصل بالإنترنت لإيقاف إشعارات هذا الجهاز قبل تسجيل الخروج.");
      return;
    }
    await clearSession();
    _token = null;                       // clear module-level first
    queryClient.clear();
    setToken(null);
    setUser(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
