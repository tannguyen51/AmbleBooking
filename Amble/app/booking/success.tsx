import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "../../i18n/useTranslation";

const PRIMARY = "#FF6B35";

export default function BookingSuccessScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const {
        restaurantName,
        restaurantImage,
        tableName,
        date,
        time,
        partySize,
        deposit,
        bookingId,
        bookingNumber,
        restaurantId,
    } = useLocalSearchParams<{
        restaurantName: string;
        restaurantImage?: string;
        tableName: string;
        date: string;
        time: string;
        partySize: string;
        deposit: string;
        bookingId: string;
        bookingNumber?: string;
        restaurantId?: string;
    }>();

    return (
        <SafeAreaView style={s.container}>
            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
                {/* Success Icon */}
                <View style={s.iconWrapper}>
                    <LinearGradient
                        colors={["#FF6B35", "#FFD700"]}
                        style={s.iconCircle}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={s.iconEmoji}>🎉</Text>
                    </LinearGradient>
                </View>

                {/* Title */}
                <Text style={s.title}>{t("booking.success.title")}</Text>
                <Text style={s.subtitle}>
                    {t("booking.success.subtitle")}
                </Text>

                {/* Restaurant Card */}
                <View style={s.card}>
                    <Image
                        source={{
                            uri: restaurantImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
                        }}
                        style={s.restaurantImage}
                    />

                    <View style={s.restaurantInfo}>
                        <View style={s.restaurantHeader}>
                            <View style={s.checkIcon}>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                            </View>
                            <View style={s.restaurantTitleWrap}>
                                <Text style={s.restaurantName}>{restaurantName}</Text>
                                <Text style={s.statusText}>{t("booking.success.confirmed")}</Text>
                            </View>
                        </View>

                        {/* Booking Details Grid */}
                        <View style={s.detailsGrid}>
                            <View style={s.detailBox}>
                                <Ionicons name="restaurant-outline" size={22} color="#6B7280" />
                                <Text style={s.detailLabel}>{t("booking.success.table")}</Text>
                                <Text style={s.detailValue}>{tableName}</Text>
                            </View>

                            <View style={s.detailBox}>
                                <Ionicons name="calendar-outline" size={22} color="#6B7280" />
                                <Text style={s.detailLabel}>{t("booking.success.date")}</Text>
                                <Text style={s.detailValue}>{date}</Text>
                            </View>

                            <View style={s.detailBox}>
                                <Ionicons name="time-outline" size={22} color="#6B7280" />
                                <Text style={s.detailLabel}>{t("booking.success.time")}</Text>
                                <Text style={s.detailValue}>{time}</Text>
                            </View>

                            <View style={s.detailBox}>
                                <Ionicons name="people-outline" size={22} color="#6B7280" />
                                <Text style={s.detailLabel}>{t("booking.success.guests")}</Text>
                                <Text style={s.detailValue}>{partySize} {t("booking.select.unitGuest")}</Text>
                            </View>
                        </View>

                        {/* Payment Info */}
                        <View style={s.paymentRow}>
                            <Text style={s.paymentLabel}>{t("booking.success.depositPaid")}</Text>
                            <Text style={s.paymentValue}>
                                {(parseInt(deposit) / 1000).toFixed(0)}.000đ
                            </Text>
                        </View>

                        {/* Booking ID */}
                        <View style={s.bookingIdRow}>
                            <Text style={s.bookingIdLabel}>{t("booking.success.bookingId")}</Text>
                            <Text style={s.bookingIdValue}>#{bookingNumber || bookingId}</Text>
                        </View>
                    </View>
                </View>

                {/* Reward Banner */}
                <View style={s.rewardBanner}>
                    <Ionicons name="star" size={28} color="#F59E0B" />
                    <View style={s.rewardText}>
                        <Text style={s.rewardTitle}>{t("booking.success.pointsEarned")}</Text>
                        <Text style={s.rewardSubtitle}>
                            {t("booking.success.pointsSubtitle")}
                        </Text>
                    </View>
                </View>

                {restaurantId && bookingId ? (
                    <TouchableOpacity
                        style={s.reviewBtn}
                        onPress={() =>
                            router.push({
                                pathname: "/booking/review" as any,
                                params: {
                                    restaurantId,
                                    restaurantName,
                                    bookingId,
                                },
                            })
                        }
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                        <Text style={s.reviewBtnText}>{t("booking.success.reviewButton")}</Text>
                    </TouchableOpacity>
                ) : null}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Actions */}
            <View style={s.bottomBar}>
                <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={() => router.push("/(tabs)/history")}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={["#FF6B35", "#FFD700"]}
                        style={s.primaryBtnInner}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={s.primaryBtnText}>{t("booking.success.viewBooking")}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={s.secondaryBtn}
                    onPress={() => router.push("/(tabs)/")}
                    activeOpacity={0.8}
                >
                    <Text style={s.secondaryBtnText}>{t("booking.success.goHome")}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA" },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 40 },
    iconWrapper: { alignItems: "center", marginBottom: 24 },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    iconEmoji: { fontSize: 56 },
    title: {
        fontSize: 28,
        fontWeight: "800",
        textAlign: "center",
        color: "#1A1A1A",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: "center",
        color: "#6B7280",
        marginBottom: 32,
        lineHeight: 22,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 16,
    },
    restaurantImage: {
        width: "100%",
        height: 180,
        backgroundColor: "#f0f0f0",
    },
    restaurantInfo: { padding: 20 },
    restaurantHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        gap: 12,
    },
    checkIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#22C55E",
        alignItems: "center",
        justifyContent: "center",
    },
    restaurantTitleWrap: { flex: 1 },
    restaurantName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 2,
    },
    statusText: {
        fontSize: 13,
        color: "#22C55E",
        fontWeight: "600",
    },
    detailsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20,
    },
    detailBox: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "#F9FAFB",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    detailIcon: { fontSize: 24, marginBottom: 8 },
    detailLabel: {
        fontSize: 12,
        color: "#9CA3AF",
        marginBottom: 4,
        fontWeight: "500",
    },
    detailValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    paymentRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        marginBottom: 12,
    },
    paymentLabel: { fontSize: 14, color: "#6B7280" },
    paymentValue: { fontSize: 18, fontWeight: "800", color: PRIMARY },
    bookingIdRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    bookingIdLabel: { fontSize: 13, color: "#9CA3AF" },
    bookingIdValue: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
    rewardBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    rewardIcon: { fontSize: 32 },
    rewardText: { flex: 1 },
    rewardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#92400E",
        marginBottom: 2,
    },
    rewardSubtitle: { fontSize: 13, color: "#B45309" },
    bottomBar: {
        padding: 20,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        gap: 12,
    },
    primaryBtn: { borderRadius: 12, overflow: "hidden" },
    primaryBtnInner: {
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    secondaryBtn: {
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
    },
    secondaryBtnText: {
        color: "#6B7280",
        fontSize: 15,
        fontWeight: "600",
    },
    reviewBtn: {
        marginTop: 8,
        backgroundColor: "#111827",
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    reviewBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
    },
});
