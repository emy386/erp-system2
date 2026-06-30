import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Worker } from "@/types";

function WorkerCard({ worker }: { worker: Worker }) {
  const colors = useColors();
  const pct = worker.totalOwed > 0
    ? Math.min(100, Math.round((worker.totalPaid / worker.totalOwed) * 100))
    : 100;

  return (
    <View style={[wStyles.card, { backgroundColor: colors.card }]}>
      <View style={wStyles.top}>
        <View style={[wStyles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[wStyles.avatarText, { color: colors.primary }]}>
            {worker.name?.charAt(0) || "؟"}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end", marginRight: 12 }}>
          <Text style={[wStyles.name, { color: colors.foreground }]}>{worker.name}</Text>
          <Text style={[wStyles.role, { color: colors.mutedForeground }]}>{worker.role}</Text>
        </View>
      </View>

      <View style={wStyles.row}>
        <View style={wStyles.stat}>
          <Text style={[wStyles.statVal, { color: colors.foreground }]}>
            {worker.totalFinishedItems || 0}
          </Text>
          <Text style={[wStyles.statLabel, { color: colors.mutedForeground }]}>قطعة منجزة</Text>
        </View>
        <View style={wStyles.stat}>
          <Text style={[wStyles.statVal, { color: "#10b981" }]}>
            {(worker.totalPaid || 0).toLocaleString()} ج
          </Text>
          <Text style={[wStyles.statLabel, { color: colors.mutedForeground }]}>مدفوع</Text>
        </View>
        <View style={wStyles.stat}>
          <Text style={[wStyles.statVal, { color: worker.remainingBalance > 0 ? "#ef4444" : "#10b981" }]}>
            {(worker.remainingBalance || 0).toLocaleString()} ج
          </Text>
          <Text style={[wStyles.statLabel, { color: colors.mutedForeground }]}>متبقي</Text>
        </View>
      </View>

      <View style={[wStyles.barBg, { backgroundColor: colors.muted }]}>
        <View style={[wStyles.barFill, { width: `${pct}%` as any, backgroundColor: pct >= 100 ? "#10b981" : colors.primary }]} />
      </View>
      <Text style={{ fontSize: 10, color: colors.mutedForeground, textAlign: "right", marginTop: 4, fontFamily: "Inter_400Regular" }}>
        {pct}% تم الدفع
      </Text>
    </View>
  );
}

const wStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  top: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  role: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  row: { flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 12 },
  stat: { alignItems: "center" },
  statVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  barBg: { height: 4, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 4 },
});

export default function ProductionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workers, productionIntakes, orders } = useApp();

  const inProductionOrders = useMemo(
    () => orders.filter((o) => o.productionStatus === "in_production"),
    [orders]
  );

  const recentIntakes = useMemo(
    () =>
      [...productionIntakes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10),
    [productionIntakes]
  );

  const totalPendingPayments = workers.reduce((s, w) => s + (w.remainingBalance || 0), 0);
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <Text style={[pStyles.title, { color: colors.foreground }]}>الإنتاج</Text>

          <View style={pStyles.summaryRow}>
            <View style={[pStyles.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[pStyles.summaryVal, { color: colors.primary }]}>{inProductionOrders.length}</Text>
              <Text style={[pStyles.summaryLabel, { color: colors.mutedForeground }]}>طلبات قيد الإنتاج</Text>
            </View>
            <View style={[pStyles.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[pStyles.summaryVal, { color: "#8b5cf6" }]}>{workers.length}</Text>
              <Text style={[pStyles.summaryLabel, { color: colors.mutedForeground }]}>عمال المشغل</Text>
            </View>
            <View style={[pStyles.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[pStyles.summaryVal, { color: "#ef4444" }]}>
                {totalPendingPayments.toLocaleString()}
              </Text>
              <Text style={[pStyles.summaryLabel, { color: colors.mutedForeground }]}>مستحقات (ج)</Text>
            </View>
          </View>

          <Text style={[pStyles.sectionTitle, { color: colors.foreground }]}>عمال المشغل</Text>
        </>
      }
      data={workers}
      keyExtractor={(w) => w.id}
      renderItem={({ item }) => <WorkerCard worker={item} />}
      ListFooterComponent={
        recentIntakes.length > 0 ? (
          <>
            <Text style={[pStyles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>
              آخر حركات الإنتاج
            </Text>
            {recentIntakes.map((intake) => (
              <View key={intake.id} style={[pStyles.intakeRow, { backgroundColor: colors.card }]}>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[pStyles.intakeName, { color: colors.foreground }]}>
                    {intake.productName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                    {intake.workerName} · {intake.color} {intake.size}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-start" }}>
                  <Text style={[pStyles.intakeQty, { color: colors.primary }]}>×{intake.quantity}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                    {intake.totalCost?.toLocaleString()} ج
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <MaterialCommunityIcons name="hammer-wrench" size={40} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>
            لا يوجد عمال مسجلون
          </Text>
        </View>
      }
    />
  );
}

const pStyles = StyleSheet.create({
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 16 },
  summaryRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  summaryVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 10 },
  intakeRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: 12, marginBottom: 8 },
  intakeName: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  intakeQty: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
