type PreferenceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
};
export type NotificationPreference = "push" | "bell";

// Preferences outlive logout; device registrations do not. Never store tokens here.
export function createNotificationPreferences(storage: PreferenceStorage) {
  const key = (userId: string, projectId: string, kind: NotificationPreference) =>
    `buffet_notification_preference:${JSON.stringify([userId, projectId, kind])}`;
  return {
    async read(userId: string, projectId: string, kind: NotificationPreference): Promise<boolean | null> {
      const value = await storage.getItem(key(userId, projectId, kind));
      return value === "on" ? true : value === "off" ? false : null;
    },
    async write(userId: string, projectId: string, kind: NotificationPreference, enabled: boolean) {
      await storage.setItem(key(userId, projectId, kind), enabled ? "on" : "off");
    },
  };
}
