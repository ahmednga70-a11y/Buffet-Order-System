import { Asset } from "expo-asset";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

/** Native alerts use their notification channel; web audio needs a user gesture. */
export function useWorkerAlertSound() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const active = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    active.current = false;
    audio.current?.pause();
    audio.current = null;
  }, []);

  const play = useCallback(async () => {
    if (Platform.OS !== "web" || typeof Audio === "undefined") return false;
    try {
      if (!audio.current) {
        audio.current = new Audio(Asset.fromModule(require("../assets/sounds/door_bell.mp3")).uri);
        audio.current.preload = "auto";
      }
      // Reuse one player: repeated alerts restart the bell instead of overlapping.
      audio.current.currentTime = 0;
      await audio.current.play();
      setError("");
      return true;
    } catch {
      active.current = false;
      setEnabled(false);
      setError("تعذّر تشغيل الجرس. اسمح بالصوت في المتصفح ثم اضغط تجربة وتفعيل الجرس مرة أخرى.");
      return false;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (active.current) {
      active.current = false;
      setEnabled(false);
      audio.current?.pause();
      return;
    }
    setBusy(true);
    try {
      // Called directly from a button so the browser can authorize playback.
      const played = await play();
      active.current = played;
      setEnabled(played);
    } finally {
      setBusy(false);
    }
  }, [play]);

  const playAlert = useCallback(() => {
    if (active.current) void play();
  }, [play]);

  return { enabled, busy, error, toggle, playAlert };
}
