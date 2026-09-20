import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { Download } from "lucide-react-native"
import { useVersionCheck } from "../hooks/useVersionCheck"
import { useAppTheme } from "../theme/theme"

// Self-contained: runs the version check on mount and renders the prompt when
// a newer build is available. Mounted once at the root so it shows on every
// launch, over whichever screen the user lands on.
export default function UpdatePrompt() {
  const { update, dismiss, openStore } = useVersionCheck()
  const { colors } = useAppTheme()

  if (!update) return null

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={update.forceUpdate ? () => {} : dismiss}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconRow, { backgroundColor: colors.primarySoft }]}>
            <Download size={26} color={colors.primary} strokeWidth={2.2} />
          </View>

          <Text style={[styles.title, { color: colors.heading }]}>New update available</Text>

          <Text style={[styles.subtitle, { color: colors.body }]}>
            Version {update.version} is ready. Update to keep using the latest features and fixes.
          </Text>

          {update.changelog ? (
            <Text style={[styles.changelog, { color: colors.muted }]}>{update.changelog}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Update now"
            onPress={() => void openStore()}
            style={({ pressed }) => [
              styles.updateButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.updateText}>Update</Text>
          </Pressable>

          {!update.forceUpdate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={dismiss}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  iconRow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },
  changelog: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
  },
  updateButton: {
    alignSelf: "stretch",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 22,
  },
  updateText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
})
