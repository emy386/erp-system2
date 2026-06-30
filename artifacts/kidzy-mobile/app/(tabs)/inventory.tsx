import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Product } from "@/types";

function ProductCard({ product }: { product: Product }) {
  const colors = useColors();
  const totalStock = product.variants?.reduce((s, v) => s + (v.quantity || 0), 0) ?? 0;
  const lowStock = product.variants?.some(
    (v) => v.quantity <= (v.lowStockThreshold || 5) && v.quantity > 0
  );
  const outOfStock = totalStock === 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.top}>
        <View>
          {outOfStock ? (
            <View style={[styles.badge, { backgroundColor: "#fee2e2" }]}>
              <Text style={[styles.badgeText, { color: "#dc2626" }]}>نفد المخزون</Text>
            </View>
          ) : lowStock ? (
            <View style={[styles.badge, { backgroundColor: "#fef3c7" }]}>
              <Text style={[styles.badgeText, { color: "#b45309" }]}>مخزون منخفض</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: "#d1fae5" }]}>
              <Text style={[styles.badgeText, { color: "#065f46" }]}>متوفر</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>
          <Text style={[styles.code, { color: colors.mutedForeground }]}>{product.code}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: colors.foreground }]}>{totalStock}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>المخزون</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: colors.foreground }]}>
            {product.sellingPrice?.toLocaleString()} ج
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>سعر البيع</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: "#10b981" }]}>
            {product.expectedProfit?.toLocaleString()} ج
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الربح</Text>
        </View>
      </View>

      {product.variants && product.variants.length > 0 && (
        <View style={[styles.variantsRow, { borderTopColor: colors.border }]}>
          {product.variants.slice(0, 5).map((v) => (
            <View
              key={v.id}
              style={[
                styles.variantChip,
                {
                  backgroundColor:
                    v.quantity === 0 ? "#fee2e2"
                    : v.quantity <= (v.lowStockThreshold || 5) ? "#fef3c7"
                    : colors.muted,
                },
              ]}
            >
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "#1e293b" }}>
                {v.color} {v.size} ({v.quantity})
              </Text>
            </View>
          ))}
          {product.variants.length > 5 && (
            <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              +{product.variants.length - 5}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useApp();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={[pageStyles.title, { color: colors.foreground }]}>المخزون</Text>
        <Text style={[pageStyles.sub, { color: colors.mutedForeground }]}>
          {filtered.length} منتج
        </Text>
        <View style={[pageStyles.searchBox, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[pageStyles.searchInput, { color: colors.foreground }]}
            placeholder="بحث باسم المنتج أو الكود..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Feather name="package" size={40} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>
              لا توجد منتجات
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  top: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  code: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  stats: { flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 10 },
  stat: { alignItems: "center" },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  variantsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, paddingTop: 10, borderTopWidth: 1, marginTop: 4 },
  variantChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
});

const pageStyles = StyleSheet.create({
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 2 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 12 },
  searchBox: { flexDirection: "row-reverse", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
