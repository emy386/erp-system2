import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { User } from "@/types";

function StaffCard({ user }: { user: User }) {
  const colors = useColors();
  const ROLE_LABELS: Record<string, string> = { owner: "مالك", manager: "مدير", staff: "موظف" };
  return (
    <View style={[sStyles.card, { backgroundColor: colors.card }]}>
      <View style={[sStyles.avatar, { backgroundColor: colors.accent }]}>
        <Text style={[sStyles.avatarText, { color: colors.primary }]}>
          {user.name?.charAt(0) || "؟"}
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: "flex-end", marginRight: 12 }}>
        <Text style={[sStyles.name, { color: colors.foreground }]}>{user.name}</Text>
        <Text style={[sStyles.role, { color: colors.mutedForeground }]}>
          {user.jobTitle || ROLE_LABELS[user.role] || user.role}
        </Text>
        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          {user.phone}
        </Text>
      </View>
      <View style={[sStyles.roleBadge, { backgroundColor: getRoleBg(user.role) }]}>
        <Text style={[sStyles.roleText, { color: getRoleColor(user.role) }]}>
          {ROLE_LABELS[user.role] || user.role}
        </Text>
      </View>
    </View>
  );
}

function getRoleBg(role: string) {
  switch (role) {
    case "owner": return "#fef3c7";
    case "manager": return "#dbeafe";
    default: return "#f1f5f9";
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case "owner": return "#b45309";
    case "manager": return "#1d4ed8";
    default: return "#475569";
  }
}

const sStyles = StyleSheet.create({
  card: { flexDirection: "row-reverse", alignItems: "center", borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  role: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, users, generalExpenses, logout } = useApp();

  const recentExpenses = useMemo(
    () =>
      [...generalExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [generalExpenses]
  );

  const totalExpenses = generalExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const paidExpenses = generalExpenses.filter((e) => e.isPaid).reduce((s, e) => s + (e.amount || 0), 0);

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {currentUser && (
        <View style={[mStyles.profileCard, { backgroundColor: colors.primary }]}>
          <View style={mStyles.profileInner}>
            <View style={mStyles.profileAvatar}>
              <Text style={mStyles.profileAvatarText}>{currentUser.name?.charAt(0) || "؟"}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", marginRight: 12 }}>
              <Text style={mStyles.profileName}>{currentUser.name}</Text>
              <Text style={mStyles.profileRole}>{currentUser.jobTitle || currentUser.role}</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={[mStyles.sectionTitle, { color: colors.foreground }]}>الفريق</Text>
      {users.map((u) => <StaffCard key={u.id} user={u} />)}
      {users.length === 0 && (
        <View style={mStyles.empty}>
          <Feather name="users" size={32} color={colors.mutedForeground} />
          <Text style={[mStyles.emptyText, { color: colors.mutedForeground }]}>لا يوجد موظفون</Text>
        </View>
      )}

      <Text style={[mStyles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>الحسابات والمصروفات</Text>
      <View style={mStyles.expRow}>
        <View style={[mStyles.expCard, { backgroundColor: colors.card }]}>
          <Text style={[mStyles.expVal, { color: "#ef4444" }]}>{totalExpenses.toLocaleString()} ج</Text>
          <Text style={[mStyles.expLabel, { color: colors.mutedForeground }]}>إجمالي المصروفات</Text>
        </View>
        <View style={[mStyles.expCard, { backgroundColor: colors.card }]}>
          <Text style={[mStyles.expVal, { color: "#10b981" }]}>{paidExpenses.toLocaleString()} ج</Text>
          <Text style={[mStyles.expLabel, { color: colors.mutedForeground }]}>مدفوع</Text>
        </View>
      </View>

      {recentExpenses.map((exp) => (
        <View key={exp.id} style={[mStyles.expenseRow, { backgroundColor: colors.card }]}>
          <View style={{ alignItems: "flex-end", flex: 1 }}>
            <Text style={[mStyles.expenseDesc, { color: colors.foreground }]}>{exp.description}</Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {exp.category} · {exp.date?.slice(0, 10)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[mStyles.expenseAmt, { color: "#ef4444" }]}>{exp.amount?.toLocaleString()} ج</Text>
            <View style={[mStyles.paidBadge, { backgroundColor: exp.isPaid ? "#d1fae5" : "#fee2e2" }]}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: exp.isPaid ? "#065f46" : "#991b1b" }}>
                {exp.isPaid ? "مدفوع" : "غير مدفوع"}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [mStyles.logoutBtn, { opacity: pressed ? 0.8 : 1 }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[mStyles.logoutText, { color: colors.destructive }]}>تسجيل الخروج</Text>
      </Pressable>
    </ScrollView>
  );
}

const mStyles = StyleSheet.create({
  profileCard: { borderRadius: 16, padding: 16, marginBottom: 20 },
  profileInner: { flexDirection: "row-reverse", alignItems: "center" },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  profileRole: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  expRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 12 },
  expCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  expVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  expLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  expenseRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: 12, marginBottom: 8 },
  expenseDesc: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  expenseAmt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  paidBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  logoutBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, padding: 16, marginTop: 24, backgroundColor: "#fee2e2" },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
