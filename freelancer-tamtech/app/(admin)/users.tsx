import { useState, useCallback, useEffect, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
} from "react-native"
import { router } from "expo-router"
import { getAdminUsers, type AdminUserRow } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

const BRAND_BLUE = "#2881FA"
const CSV_URL = "https://spirospares.com/api/admin/users/csv"

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "#ede9fe", text: "#5b21b6" },
  admin: { bg: "#dbeafe", text: "#1e40af" },
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await getAdminUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load admin users.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
  }, [load])

  const handleCsvDownload = async () => {
    try {
      await Linking.openURL(CSV_URL)
    } catch {
      Alert.alert("Error", "Could not open download link.")
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    )
  }, [users, search])

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return d || ""
    }
  }

  const activeUsers = users.filter((u) => u.is_active).length

  return (
    <View style={s.container}>
      <View style={s.brandBar}>
        <Text style={s.brandText}>TAMTECH TOOLS LTD</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_BLUE} />
        }
      >
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Admin Users</Text>
            <Text style={s.headerSub}>
              {users.length} total | {activeUsers} active
            </Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={handleCsvDownload} style={s.csvBtn}>
              <Text style={s.csvBtnText}>⬇ CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <TextInput
            placeholder="Search by name, email or role..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
          />
        </View>

        {loading && (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
          </View>
        )}

        {error && (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <Text style={s.emptyText}>
            {search ? "No users match your search." : "No admin users found."}
          </Text>
        )}

        {filtered.map((user) => (
          <View key={user.id} style={[s.card, SHADOWS.cardSm]}>
            <View style={s.cardRow1}>
              <Text style={s.nameText}>{user.full_name}</Text>
              <View style={s.badgeRow}>
                <View style={[s.roleBadge, { backgroundColor: (ROLE_BADGE[user.role] || { bg: "#f1f5f9" }).bg }]}>
                  <Text style={[s.roleText, { color: (ROLE_BADGE[user.role] || { text: "#475569" }).text }]}>
                    {user.role.replace(/_/g, " ")}
                  </Text>
                </View>
                <View style={[s.activeBadge, { backgroundColor: user.is_active ? "#d1fae5" : "#fee2e2" }]}>
                  <Text style={[s.activeText, { color: user.is_active ? "#065f46" : "#991b1b" }]}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={s.subText}>📧 {user.email}</Text>
            <View style={s.footerRow}>
              <Text style={s.dateText}>Created: {formatDate(user.created_at)}</Text>
              {user.last_login_at && (
                <Text style={s.dateText}>Last login: {formatDate(user.last_login_at)}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  brandBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingVertical: 16,
  },
  brandText: { fontSize: 20, fontWeight: "700", color: "#1e293b" },

  scroll: { flex: 1, paddingHorizontal: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  headerSub: { marginTop: 4, fontSize: 13, color: "#64748b" },
  headerActions: { flexDirection: "row", gap: 8 },
  csvBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  csvBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  backText: { fontSize: 13, fontWeight: "500", color: "#64748b" },

  searchWrap: { marginBottom: 14 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameText: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  badgeRow: { flexDirection: "row", gap: 6 },
  roleBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  roleText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  activeBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  activeText: { fontSize: 10, fontWeight: "700" },
  subText: { fontSize: 12, color: "#64748b", marginTop: 6 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  dateText: { fontSize: 11, color: "#94a3b8" },

  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 32, fontSize: 14 },
  centerWrap: { marginTop: 32, alignItems: "center" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: BRAND_BLUE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
})