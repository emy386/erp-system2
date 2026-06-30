import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { users, setCurrentUser } = useApp();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError("يرجى إدخال رقم الهاتف وكلمة المرور");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 300));
    const found = users.find(
      (u) => u.phone === phone.trim() && u.password === password.trim()
    );
    if (found) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setCurrentUser(found);
      router.replace("/(tabs)");
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("رقم الهاتف أو كلمة المرور غير صحيحة");
    }
    setLoading(false);
  };

  const s = styles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.inner}>
        <View style={s.logoBox}>
          <Text style={s.logoText}>Kidzy</Text>
          <Text style={s.logoSub}>نظام إدارة المبيعات</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>رقم الهاتف</Text>
          <TextInput
            style={s.input}
            placeholder="01xxxxxxxxx"
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            textAlign="right"
          />

          <Text style={s.label}>كلمة المرور</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textAlign="right"
          />

          {error !== "" && <Text style={s.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>تسجيل الدخول</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: insets.top,
      paddingBottom: insets.bottom + 24,
    },
    logoBox: {
      alignItems: "center",
      marginBottom: 40,
    },
    logoText: {
      fontSize: 40,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      letterSpacing: -1,
    },
    logoSub: {
      fontSize: 15,
      color: colors.mutedForeground,
      marginTop: 4,
      fontFamily: "Inter_400Regular",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    label: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 6,
      textAlign: "right",
    },
    input: {
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      marginBottom: 16,
    },
    error: {
      color: colors.destructive,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "Inter_400Regular",
    },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 4,
    },
    btnText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
  });
