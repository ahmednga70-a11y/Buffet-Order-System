import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import Constants from "expo-constants";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

const TOKEN_KEY = "buffet_auth_token";
const USER_KEY = "buffet_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          _token = storedToken;          // set module-level first
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch {
        // ignore restore errors
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (authUser: AuthUser, authToken: string) => {
    _token = authToken;                  // set module-level first
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, authToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser)),
    ]);
    setToken(authToken);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    _token = null;                       // clear module-level first
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
