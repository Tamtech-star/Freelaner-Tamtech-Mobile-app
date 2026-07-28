
import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { COLORS } from "../constants/config";

type BannerType = "error" | "warning" | "success" | "info";

interface ErrorBannerProps {
  type: BannerType;
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const COLORS_MAP: Record<BannerType, { bg: string; border: string; text: string }> = {
  error: { bg: "#fee2e2", border: "#fecaca", text: "#991b1b" },
  warning: { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
};

export default function ErrorBanner({ type, message, visible, onDismiss, onRetry }: ErrorBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -40, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && (opacity as any)._value === 0) return null;

  const colors = COLORS_MAP[type];

  return (
    <Animated.View
      style={[
        styles.wrap,
        { backgroundColor: colors.bg, borderColor: colors.border, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {(onRetry || onDismiss) && (
        <View style={styles.actions}>
          {onRetry && (
            <TouchableOpacity onPress={onRetry} style={[styles.btn, { backgroundColor: colors.text }]}>
              <Text style={styles.btnText}>Retry</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
              <Text style={[styles.dismissText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  dismissBtn: {
    padding: 4,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
