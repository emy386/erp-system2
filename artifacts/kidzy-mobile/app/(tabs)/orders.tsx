import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Order } from "@/types";

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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#dbeafe", text: "#1d4ed8" },
  manufactured: { bg: "#e0e7ff", text: "#3730a3" },
  shipped: { bg: "#fef3c7", text: "#b45309" },
  out_for_delivery: { bg: "#fef3c7", text: "#b45309" },
  in_delivery: { bg: "#fef3c7", text: "#b45309" },
  delivered: { bg: "#d1fae5", text: "#065f46" },
  completed: { bg: "#d1fae5", text: "#065f46" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
  returned: { bg: "#fee2e2", text: "#991b1b" },
  returned_partial: { bg: "#ffedd5", text: "#9a3412" },
  delayed: { bg: "#f3e8ff", text: "#6b21a8" },
};

const FILTER_OPTIONS = [
  { key: "all", label: "الكل" },
  { key: "new", label: "جديد" },
  { key: "manufactured", label: "مصنّع" },
  { key: "shipped", label: "مشحون" },
  { key: "delivered", label: "مُسلَّم" },
  { key: "cancelled", label: "ملغي" },
];

function OrderCard({ order }: { order: Order }) {
  const colors = useColors();
  const sc = STATUS_COLORS[order.status] || { bg: "#f1f5f9", text: "#475569" };
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card }]}>
      <View style={cardStyles.top}>
        <View style={[cardStyles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[cardStyles.badgeText, { color: sc.text }]}>
            {STATUS_LABELS[order.status] || order.status}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[cardStyles.name, { color: colors.foreground }]}>{order.customerName}</Text>
          {order.isUrgent && (
            <View style={cardStyles.urgentBadge}>
              <Text style={cardStyles.urgentText}>عاجل</Text>
            </View>
          )}
        </View>
      </View>
      <View style={cardStyles.row}>
        <Text style={[cardStyles.info, { color: colors.mutedForeground }]}>{order.governorate}</Text>
        <Text style={[cardStyles.info, { color: colors.mutedForeground }]}>
          <Feather name="map-pin" size={11} /> {order.customerPhone}
        </Text>
      </View>
      <View style={[cardStyles.row, { marginTop: 8 }]}>
        <Text style={[cardStyles.total, { color: colors.primary }]}>{order.total?.toLocaleString()} ج</Text>
        <Text style={[cardStyles.date, { color: colors.mutedForeground }]}>
          {order.items?.length || 0} قطعة
        </Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  top: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  urgentBadge: { backgroundColor: "#fee2e2", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: "flex-end" },
  urgentText: { fontSize: 10, color: "#dc2626", fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  info: { fontSize: 12, fontFamily: "Inter_400Regular" },
  total: { fontSize: 16, fontFamily: "Inter_700Bold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = [...orders].sort(
      (a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    );
    if (filter !== "all") list = list.filter((o) => o.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.includes(q) ||
          o.governorate?.includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>الطلبات</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {filtered.length} طلب
        </Text>
        <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="بحث باسم العميل أو المحافظة..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
      </View>

      <FlatList
        data={FILTER_OPTIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        inverted
        keyExtractor={(i) => i.key}
        style={{ maxHeight: 44, paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setFilter(item.key)}
            style={[
              styles.filterChip,
              filter === item.key
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.muted },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === item.key ? "#fff" : colors.mutedForeground },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <OrderCard order={item} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>
              لا توجد طلبات
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 2 },
  count: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 12 },
  searchBox: { flexDirection: "row-reverse", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8, height: 36, justifyContent: "center" },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
