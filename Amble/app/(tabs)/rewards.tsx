import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { userAPI } from "../../services/api";
import { useTranslation } from "../../i18n/useTranslation";

const PRIMARY = "#FF6B35";
const BG = "#F8FAFC";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const MUTED = "#9CA3AF";

type RewardTab = "journey" | "redeem" | "earn";

type Tier = {
  id: string;
  label: string;
  min: number;
  max: number;
  bonus: number;
};

type RewardEntry = {
  title: string;
  points: number;
  type: "earn" | "redeem";
  createdAt: string;
};

type RewardResponse = {
  success: boolean;
  points: number;
  currentTier: Tier;
  nextTier: Tier | null;
  neededToNextTier: number;
  progress: number;
  tiers: Tier[];
  history: RewardEntry[];
};

type RedeemItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  cost: number;
};

function formatPoints(value: number) {
  return value.toLocaleString("vi-VN");
}

function getTierIcon(tierId: string): keyof typeof Ionicons.glyphMap {
  if (tierId === "bronze") return "medal-outline";
  if (tierId === "silver") return "ribbon-outline";
  if (tierId === "gold") return "trophy-outline";
  return "diamond-outline";
}

function getTierColor(tierId: string): string {
  if (tierId === "bronze") return "#B45309";
  if (tierId === "silver") return "#64748B";
  if (tierId === "gold") return "#EAB308";
  return "#A855F7";
}

export default function RewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const REDEEM_ITEMS: RedeemItem[] = [
    {
      id: "drink",
      icon: "wine-outline",
      title: t("rewards.voucherDrink"),
      desc: t("rewards.voucherDrinkDesc"),
      cost: 7500,
    },
    {
      id: "50k",
      icon: "cash-outline",
      title: t("rewards.voucher50k"),
      desc: t("rewards.voucher50kDesc"),
      cost: 15000,
    },
    {
      id: "100k",
      icon: "gift-outline",
      title: t("rewards.voucher100k"),
      desc: t("rewards.voucher100kDesc"),
      cost: 25000,
    },
  ];

  const EARN_RULES = [
    { label: t("rewards.earnNewRestaurant"), value: "+5,000 + 1 " + t("rewards.earnStamp") },
    { label: t("rewards.earnBookingComplete"), value: t("rewards.earn200") },
    { label: t("rewards.earnReviewPhoto"), value: t("rewards.earn500") },
    { label: t("rewards.earnLargeGroup"), value: t("rewards.earn1000") },
    { label: t("rewards.earnBirthdayWeek"), value: t("rewards.earnBonus") },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<RewardResponse | null>(null);
  const [activeTab, setActiveTab] = useState<RewardTab>("journey");
  const [selectedRedeem, setSelectedRedeem] = useState<RedeemItem | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      const res = await userAPI.getRewards();
      setData(res.data);
    } catch (error) {
      if (__DEV__) console.warn("[Rewards] fetch error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const progressWidth = useMemo(() => {
    const p = data?.progress || 0;
    return `${Math.max(0, Math.min(100, p))}%` as const;
  }, [data?.progress]);

  const myPoints = data?.points || 0;
  const history = data?.history || [];
  const tiers = data?.tiers || [];
  const rewardPointColor = getTierColor(data?.currentTier?.id || "bronze");

  const confirmRedeem = () => {
    if (!selectedRedeem) return;
    if (myPoints < selectedRedeem.cost) {
      Alert.alert(t("rewards.insufficientPoints"), t("rewards.insufficientMessage"));
      return;
    }
    Alert.alert(t("common.success"), t("rewards.redeemSuccess", { title: selectedRedeem.title }));
    setSelectedRedeem(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["left", "right"]}>
        <View style={[s.headerWrap, { paddingTop: 12 + insets.top }]}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{t("rewards.title")}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchRewards();
            }}
          />
        }
      >
        <View style={[s.headerWrap, { paddingTop: 12 + insets.top }]}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{t("rewards.title")}</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={s.pointsBig}>{formatPoints(myPoints)}</Text>
          <Text style={s.pointsSub}>{t("rewards.points")}</Text>

          <View style={s.memberRow}>
            <Ionicons name="ribbon-outline" size={16} color="#93C5FD" />
            <Text style={s.memberText}>
              {data?.currentTier?.label || t("rewards.tierBronze")} {t("rewards.member")}
            </Text>
          </View>

          <View style={s.progressCard}>
            <View style={s.progressHeaderRow}>
              <View style={s.progressTierRow}>
                <Ionicons
                  name={getTierIcon(data?.currentTier?.id || "bronze")}
                  size={14}
                  color="#9CA3AF"
                />
                <Text style={s.progressTierText}>
                  {data?.currentTier?.label || t("rewards.tierBronze")}
                </Text>
              </View>

              <View style={s.progressTierRow}>
                <Ionicons
                  name={getTierIcon(data?.nextTier?.id || "platinum")}
                  size={14}
                  color="#F59E0B"
                />
                <Text style={s.progressTierText}>
                  {data?.nextTier?.label || t("rewards.tierMax")}
                </Text>
              </View>
            </View>

            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: progressWidth }]} />
            </View>

            <Text style={s.progressNote}>
              {data?.nextTier
                ? t("rewards.progress", { needed: formatPoints(data.neededToNextTier), nextTier: data.nextTier.label })
                : t("rewards.maxTier")}
            </Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.tabsWrap}>
            <TouchableOpacity
              style={[s.tabBtn, activeTab === "journey" && s.tabBtnActive]}
              onPress={() => setActiveTab("journey")}
              activeOpacity={0.8}
            >
              <Text
                style={[s.tabText, activeTab === "journey" && s.tabTextActive]}
              >
                {t("rewards.tabJourney")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tabBtn, activeTab === "redeem" && s.tabBtnActive]}
              onPress={() => setActiveTab("redeem")}
              activeOpacity={0.8}
            >
              <Text
                style={[s.tabText, activeTab === "redeem" && s.tabTextActive]}
              >
                {t("rewards.tabRedeem")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tabBtn, activeTab === "earn" && s.tabBtnActive]}
              onPress={() => setActiveTab("earn")}
              activeOpacity={0.8}
            >
              <Text
                style={[s.tabText, activeTab === "earn" && s.tabTextActive]}
              >
                {t("rewards.tabEarn")}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "journey" && (
            <>
              <Text style={s.sectionTitle}>{t("rewards.journeyTitle")}</Text>
              {tiers.map((tier) => {
                const active = tier.id === data?.currentTier?.id;
                return (
                  <View
                    key={tier.id}
                    style={[s.tierItem, active && s.tierItemActive]}
                  >
                    <View style={s.tierLeft}>
                      <Ionicons
                        name={getTierIcon(tier.id)}
                        size={22}
                        color={
                          tier.id === "gold"
                            ? "#FACC15"
                            : tier.id === "platinum"
                              ? "#A855F7"
                              : tier.id === "bronze"
                                ? "#B45309"
                                : "#64748B"
                        }
                      />
                      <View>
                        <View style={s.tierNameRow}>
                          <Text
                            style={[
                              s.tierName,
                              { color: getTierColor(tier.id) },
                              active && s.tierNameActive,
                            ]}
                          >
                            {tier.label}
                          </Text>
                          {active && (
                            <Text style={s.myTierBadge}>Hạng của bạn</Text>
                          )}
                        </View>
                        <Text style={s.tierRange}>
                          {formatPoints(tier.min)} -{" "}
                          {tier.max >= 999999 ? "∞" : formatPoints(tier.max)}{" "}
                          điểm
                        </Text>
                      </View>
                    </View>
                    <View style={s.bonusWrap}>
                      <Text style={s.bonusValue}>+{tier.bonus}%</Text>
                      <Text style={s.bonusLabel}>bonus</Text>
                    </View>
                  </View>
                );
              })}

              <Text style={s.sectionTitle}>{t("rewards.journeyHistory")}</Text>
              {history.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyText}>{t("rewards.journeyEmpty")}</Text>
                </View>
              ) : (
                history.map((item, idx) => (
                  <View key={`${item.createdAt}-${idx}`} style={s.historyItem}>
                    <View>
                      <Text style={s.historyTitle}>{item.title}</Text>
                      <Text style={s.historyDate}>
                        {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      </Text>
                    </View>
                    <Text
                      style={[
                        s.historyPoints,
                        item.type === "redeem"
                          ? s.minus
                          : { color: rewardPointColor },
                      ]}
                    >
                      {item.type === "redeem" ? "-" : "+"}
                      {formatPoints(Math.abs(item.points))}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === "redeem" && (
            <>
              <Text style={s.sectionTitle}>
                {t("rewards.redeemYourPoints", { points: formatPoints(myPoints) })}
              </Text>
              {REDEEM_ITEMS.map((item) => {
                const canRedeem = myPoints >= item.cost;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.redeemItem, !canRedeem && s.redeemItemDisabled]}
                    onPress={() => setSelectedRedeem(item)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        s.redeemIconWrap,
                        !canRedeem && { backgroundColor: "#E5E7EB" },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={canRedeem ? "#fff" : "#9CA3AF"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.redeemTitle}>{item.title}</Text>
                      <Text style={s.redeemDesc}>{item.desc}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          s.redeemCost,
                          !canRedeem && { color: "#9CA3AF" },
                        ]}
                      >
                        {formatPoints(item.cost)}
                      </Text>
                      <Text style={s.redeemCostLabel}>điểm</Text>
                      {!canRedeem && (
                        <Ionicons
                          name="lock-closed-outline"
                          size={14}
                          color="#9CA3AF"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {activeTab === "earn" && (
            <>
              <Text style={s.sectionTitle}>{t("rewards.earnTitle")}</Text>
              {EARN_RULES.map((rule) => (
                <View key={rule.label} style={s.ruleItem}>
                  <Text style={s.ruleLabel}>{rule.label}</Text>
                  <Text style={s.ruleValue}>{rule.value}</Text>
                </View>
              ))}

              <View style={s.rulesNote}>
                <Text style={s.rulesNoteTitle}>{t("rewards.earnRules")}</Text>
                <Text style={s.rulesNoteText}>{t("rewards.earnMaxPerDay")}</Text>
                <Text style={s.rulesNoteText}>{t("rewards.earnBillMatch")}</Text>
                <Text style={s.rulesNoteText}>{t("rewards.earnReviewBooking")}</Text>
                <Text style={s.rulesNoteText}>{t("rewards.earnExpiry")}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedRedeem} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <Ionicons
                name={selectedRedeem?.icon || "gift-outline"}
                size={24}
                color="#fff"
              />
            </View>
            <Text style={s.modalTitle}>{selectedRedeem?.title}</Text>
            <Text style={s.modalDesc}>{selectedRedeem?.desc}</Text>

            <View style={s.modalInfoBox}>
              <View style={s.modalInfoRow}>
                <Text style={s.modalInfoLabel}>{t("rewards.cost")}</Text>
                <Text style={s.modalCost}>
                  {formatPoints(selectedRedeem?.cost || 0)} điểm
                </Text>
              </View>
              <View style={s.modalInfoRow}>
                <Text style={s.modalInfoLabel}>{t("rewards.remaining")}</Text>
                <Text style={s.modalRemain}>
                  {formatPoints(
                    Math.max(0, myPoints - (selectedRedeem?.cost || 0)),
                  )}{" "}
                  điểm
                </Text>
              </View>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setSelectedRedeem(null)}
              >
                <Text style={s.modalCancelText}>{t("common.close")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalConfirmBtn}
                onPress={confirmRedeem}
              >
                <Text style={s.modalConfirmText}>{t("rewards.redeemButton")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerWrap: {
    backgroundColor: "#202124",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },

  pointsBig: {
    color: "#fff",
    fontSize: 35,
    fontWeight: "900",
    textAlign: "center",
  },
  pointsSub: {
    color: "#9CA3AF",
    fontSize: 17,
    textAlign: "center",
    marginTop: 6,
  },
  memberRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  memberText: {
    color: "#E5E7EB",
    fontSize: 21,
    fontWeight: "700",
  },

  progressCard: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 12,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTierRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  progressTierText: {
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "700",
  },
  progressTrack: {
    height: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#FACC15" },
  progressNote: {
    marginTop: 8,
    color: "#D1D5DB",
    fontSize: 17,
    textAlign: "center",
  },

  body: { padding: 16, paddingBottom: 32 },
  tabsWrap: {
    flexDirection: "row",
    backgroundColor: "#EFF1F5",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 15, color: MUTED, fontWeight: "700" },
  tabTextActive: { color: PRIMARY },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 10,
  },

  tierItem: {
    backgroundColor: "#F5F7FB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tierItemActive: { backgroundColor: "#fff", borderColor: "#9CA3AF" },
  tierLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  tierNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierName: { fontSize: 15, fontWeight: "800", color: "#4B5563" },
  tierNameActive: { color: TEXT },
  myTierBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tierRange: { marginTop: 2, fontSize: 12, color: TEXT_SEC },
  bonusWrap: { alignItems: "flex-end" },
  bonusValue: { fontSize: 15, fontWeight: "900", color: "#9CA3AF" },
  bonusLabel: { fontSize: 12, color: "#9CA3AF" },

  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  historyDate: { marginTop: 3, fontSize: 12, color: MUTED },
  historyPoints: { fontSize: 15, fontWeight: "900" },
  plus: { color: "#16A34A" },
  minus: { color: "#DC2626" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  emptyText: { fontSize: 12, color: TEXT_SEC },

  pointsHighlight: { color: PRIMARY, fontWeight: "900" },
  redeemItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  redeemItemDisabled: { opacity: 0.6 },
  redeemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  redeemTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
  redeemDesc: { marginTop: 3, fontSize: 12, color: TEXT_SEC, lineHeight: 18 },
  redeemCost: { fontSize: 15, fontWeight: "900", color: PRIMARY },
  redeemCostLabel: { fontSize: 12, color: MUTED },

  ruleItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ruleLabel: { fontSize: 15, fontWeight: "700", color: TEXT, flex: 1 },
  ruleValue: { fontSize: 15, fontWeight: "900", color: "#16A34A" },

  rulesNote: {
    marginTop: 12,
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 12,
  },
  rulesNoteTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: PRIMARY,
    marginBottom: 6,
  },
  rulesNoteText: { fontSize: 12, color: TEXT_SEC, lineHeight: 18 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: TEXT,
    textAlign: "center",
  },
  modalDesc: {
    marginTop: 6,
    fontSize: 12,
    color: TEXT_SEC,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
  },
  modalInfoBox: {
    width: "100%",
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalInfoLabel: { fontSize: 15, color: TEXT_SEC },
  modalCost: { fontSize: 15, fontWeight: "900", color: PRIMARY },
  modalRemain: { fontSize: 15, fontWeight: "900", color: "#16A34A" },
  modalActions: { width: "100%", flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "700", color: "#4B5563" },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#FACC15",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 15, fontWeight: "800", color: TEXT },
});
