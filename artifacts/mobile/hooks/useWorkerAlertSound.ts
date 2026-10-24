import { Asset } from "expo-asset";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { createNotificationPreferences } from "@/utils/notificationPreferences";

const preferences = createNotificationPreferences(AsyncStorage);

/** Native alerts use their notification channel; web audio needs a user gesture. */
export function useWorkerAlertSound() {
  const { user } = useAuth();
  const audio = useRef<HTMLAudioElement | null>(null);
  const active = useRef(false);
  const scope = useRef(0);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    scope.current++;
    let cancelled = false;
    active.current = false; setEnabled(false); setError(""); setNeedsGesture(false);
    if (Platform.OS === "web" && user) {
      setBusy(true);
      preferences.read(user.id, user.projectId, "bell").then((wanted) => {
        if (!cancelled) { active.current = wanted === true; setEnabled(wanted === true); }
      }).catch(() => {
        if (!cancelled) setError("تعذّر قراءة اختيار الجرس المحفوظ. تحقق من السماح بتخزين بيانات الموقع.");
      }).finally(() => { if (!cancelled) setBusy(false); });
    }
    return () => {
      scope.current++;
      cancelled = true; active.current = false;
      audio.current?.pause(); audio.current = null;
    };
  }, [user?.id, user?.projectId]);

  const play = useCallback(async () => {
    if (Platform.OS !== "web" || typeof Audio === "undefined") return false;
    const version = scope.current;
    try {
      if (!audio.current) {
        audio.current = new Audio(Asset.fromModule(require("../assets/sounds/door_bell.mp3")).uri);
        audio.current.preload = "auto";
      }
      // Reuse one player: repeated alerts restart the bell instead of overlapping.
      audio.current.currentTime = 0;
      await audio.current.play();
      if (scope.current !== version) return false;
      setError(""); setNeedsGesture(false);
      return true;
    } catch {
      if (scope.current !== version) return false;
      // A browser autoplay block is not the user choosing to switch alerts off.
      setNeedsGesture(true);
      setError("اختيار الجرس محفوظ، لكن المتصفح منع الصوت أو تعذّر تحميله. اسمح بالصوت واضغط تشغيل الجرس لهذا المتصفح.");
      return false;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (!user) return;
    const version = scope.current;
    if (active.current) {
      active.current = false;
      setEnabled(false);
      audio.current?.pause();
      setNeedsGesture(false); setError("");
      try { await preferences.write(user.id, user.projectId, "bell", false); }
      catch { if (scope.current === version) setError("الصوت متوقف لهذه الصفحة، لكن تعذّر حفظ الإيقاف على الجهاز."); }
      return;
    }
    setBusy(true);
    try {
      // Called directly from a button so the browser can authorize playback.
      const played = await play();
      if (played) {
        await preferences.write(user.id, user.projectId, "bell", true);
        if (scope.current !== version) return;
        active.current = true;
        setEnabled(true);
      }
    } catch {
      if (scope.current !== version) return;
      audio.current?.pause();
      active.current = false; setEnabled(false);
      setError("تعذّر حفظ اختيار الجرس. اسمح بتخزين بيانات الموقع ثم حاول مرة أخرى.");
    } finally {
      if (scope.current === version) setBusy(false);
    }
  }, [play, user?.id, user?.projectId]);

  const playAlert = useCallback(() => {
    if (active.current) void play();
  }, [play]);

  return { enabled, busy, error, needsGesture, resume: play, toggle, playAlert };
}
