import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { User } from "@workspace/api-client-react";

const KEY = "buffet_session_v2";
type Session = { user: User; token: string };

export async function saveSession(session: Session, remember: boolean) {
  const value = JSON.stringify(session);
  if (Platform.OS === "web") {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
    (remember ? window.localStorage : window.sessionStorage).setItem(KEY, value);
  } else if (remember) {
    await SecureStore.setItemAsync(KEY, value);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
  await AsyncStorage.multiRemove(["buffet_auth_token", "buffet_auth_user"]);
}
export async function readSession(): Promise<Session | null> {
  const value = Platform.OS === "web"
    ? window.sessionStorage.getItem(KEY) ?? window.localStorage.getItem(KEY)
    : await SecureStore.getItemAsync(KEY);
  if (value) return JSON.parse(value) as Session;
  // Move existing native sessions out of unencrypted AsyncStorage.
  const [token, rawUser] = await AsyncStorage.multiGet(["buffet_auth_token", "buffet_auth_user"]);
  if (token?.[1] && rawUser?.[1]) {
    const session = { token: token[1], user: JSON.parse(rawUser[1]) as User };
    await saveSession(session, true);
    return session;
  }
  return null;
}
export async function clearSession() {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
  } else await SecureStore.deleteItemAsync(KEY);
  await AsyncStorage.multiRemove(["buffet_auth_token", "buffet_auth_user"]);
}
