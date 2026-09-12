import type { Project } from "@workspace/api-client-react";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";

interface Props {
  projects?: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function ProjectSelector({ projects = [], selectedId, onSelect, loading }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>اختر المشروع</Text>
      {loading ? (
        <ActivityIndicator color={colors.light.primary} />
      ) : (
        <View style={styles.options}>
          {projects.map((project) => {
            const selected = project.id === selectedId;
            return (
              <Pressable
                key={project.id}
                onPress={() => onSelect(project.id)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {project.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.light.foreground, textAlign: "right" },
  options: { gap: 8 },
  option: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: colors.radius,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: colors.light.card,
    alignItems: "center",
  },
  optionSelected: { borderColor: colors.light.primary, backgroundColor: colors.light.secondary },
  optionText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.light.mutedForeground },
  optionTextSelected: { color: colors.light.primary },
});