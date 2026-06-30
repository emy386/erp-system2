import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type KpiCardProps = {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  iconColor: string;
  bgColor: string;
};

function KpiCard({ label, value, sub, icon, iconColor, bgColor }: KpiCardProps) {
  const colors = useColors();
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card }]}>
      <View style={[cardStyles.iconBox, { backgroundColor: bgColor }]}>
        <Feather name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[cardStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[cardStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {sub && <Text style={[cardStyles.sub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "flex-end",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    textAlign: "right",
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});

const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  manufactured: "مصنّع",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
  out_for_delivery: "خارج للتوصيل",
  in_delivery: "في التوصيل",
  completed: "مكتمل",
  delayed: "متأخر",
  returned_partial: "مرتجع جزئي",
};

function getStatusColor(status: string) {
  switch (status) {
    case "new": return "#dbeafe";
    case "delivered": case "completed": return "#d1fae5";
    case "cancelled": case "returned": return "#fee2e2";
    case "shipped": case "out_for_delivery": return "#fef3c7";
    default: return "#f1f5f9";
  }
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders, products, workers, generalExpenses, syncStatus, isLoading } = useApp();

  const kpis = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled" && o.status !== "returned")
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const activeOrders = orders.filter(
      (o) => !["delivered", "cancelled", "returned", "completed"].includes(o.status)
    ).length;
    const urgentOrders = orders.filter((o) => o.isUrgent).length;
    const pendingWorkerPayments = workers.reduce(
      (sum, w) => sum + (w.remainingBalance || 0), 0
    );
    const totalExpenses = generalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    return {
      totalRevenue, activeOrders, urgentOrders,
      totalProducts: products.length,
      pendingWorkerPayments, totalExpenses,
      totalOrders: orders.length,
    };
  }, [orders, products, workers, generalExpenses]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime())
        .slice(0, 6),
    [orders]
  );

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 16);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>
          جاري التحميل...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Kidzy</Text>
        <View style={[styles.syncDot, {
          backgroundColor: syncStatus === "synced" ? "#10b981"
            : syncStatus === "error" ? colors.destructive : "#f59e0b"
        }]} />
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>لوحة التحكم</Text>

      <View style={styles.row}>
        <KpiCard label="إجمالي الإيرادات" value={`${kpis.totalRevenue.toLocaleString()} ج`}
          icon="trending-up" iconColor={colors.primary} bgColor={colors.accent} />
        <KpiCard label="الطلبات النشطة" value={String(kpis.activeOrders)}
          sub={`من ${kpis.totalOrders} طلب`} icon="shopping-bag"
          iconColor="#f59e0b" bgColor="#fef3c7" />
      </View>
      <View style={styles.row}>
        <KpiCard label="طلبات عاجلة" value={String(kpis.urgentOrders)}
          icon="alert-circle" iconColor={colors.destructive} bgColor="#fee2e2" />
        <KpiCard label="المنتجات" value={String(kpis.totalProducts)}
          icon="package" iconColor="#10b981" bgColor="#d1fae5" />
      </View>
      <View style={styles.row}>
        <KpiCard label="مستحقات العمال" value={`${kpis.pendingWorkerPayments.toLocaleString()} ج`}
          icon="users" iconColor="#8b5cf6" bgColor="#ede9fe" />
        <KpiCard label="المصروفات" value={`${kpis.totalExpenses.toLocaleString()} ج`}
          icon="credit-card" iconColor="#ef4444" bgColor="#fee2e2" />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر الطلبات</Text>
      {recentOrders.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد طلبات</Text>
        </View>
      ) : recentOrders.map((order) => (
        <View key={order.id} style={[styles.orderRow, { backgroundColor: colors.card }]}>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[styles.orderName, { color: colors.foreground }]}>{order.customerName}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {order.governorate}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", marginRight: 12 }}>
            <Text style={[styles.orderTotal, { color: colors.primary }]}>
              {order.total?.toLocaleString()} ج
            </Text>
            <View style={[styles.badge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "#1e293b" }}>
                {STATUS_LABELS[order.status] || order.status}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 24 },
  row: { flexDirection: "row-reverse", gap: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 12, marginTop: 8 },
  orderRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  orderName: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  orderTotal: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 8, fontFamily: "Inter_400Regular" },
});
