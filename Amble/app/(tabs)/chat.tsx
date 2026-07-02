import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import {
  ambleAI,
  AISession,
  DEFAULT_SESSION,
} from "@/services/ambleAI";
import type { TableCard, QuickReply } from "@/types/chat";
import { ChatMessage } from "@/types/chat";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuthStore } from "../../store/authStore";
import { bookingAPI } from "../../services/api";
import { useLocation } from "../../hooks/useLocation";

const PRIMARY = "#6F55FF";
const ACCENT = "#FF8F1F";
const { width: SW } = Dimensions.get("window");

// ─── Table Card Component ─────────────────────────────────────────────────────

function TableCardItem({
  card,
  draft,
  onBook,
}: {
  card: TableCard;
  draft: any;
  onBook: (card: TableCard) => void;
}) {
  const { t } = useTranslation();
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const typeConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    vip: { label: t("chat.tableVIP"), color: "#9333EA", bg: "#FAF5FF" },
    view: { label: t("chat.tableView"), color: "#3B82F6", bg: "#EFF6FF" },
    regular: { label: t("chat.tableRegular"), color: "#22C55E", bg: "#F0FDF4" },
    standard: { label: t("chat.tableRegular"), color: "#22C55E", bg: "#F0FDF4" },
  };
  const cfg = typeConfig[card.tableType] || typeConfig.regular;
  const allImages = [card.restaurantImage, ...card.tableImages].filter(Boolean);

  return (
    <View style={tc.card}>
      {/* Restaurant header */}
      <View style={tc.restHeader}>
        <Image
          source={{
            uri:
              card.restaurantImage ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200",
          }}
          style={tc.restAvatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={tc.restName} numberOfLines={1}>
            {card.restaurantName}
          </Text>
          <View style={tc.restMeta}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={tc.restRating}>
              {card.restaurantRating?.toFixed(1)}
            </Text>
            <Text style={tc.restSep}>•</Text>
            <Text style={tc.restCity} numberOfLines={1}>
              {card.restaurantCity}
            </Text>
          </View>
        </View>
      </View>

      {/* Table image — tap to open gallery */}
      <TouchableOpacity
        onPress={() => {
          setGalleryIdx(0);
          setShowGallery(true);
        }}
        activeOpacity={0.9}
      >
        <Image
          source={{
            uri:
              card.tableImage ||
              card.restaurantImage ||
              "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
          }}
          style={tc.tableImg}
          resizeMode="cover"
        />
        {/* Type badge */}
        <View style={[tc.typeBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[tc.typeBadgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
        {/* Gallery indicator */}
        {allImages.length > 1 && (
          <View style={tc.galleryBadge}>
            <Ionicons name="images-outline" size={12} color="#fff" />
            <Text style={tc.galleryCount}>{allImages.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Table info */}
      <View style={tc.body}>
        <View style={tc.titleRow}>
          <Text style={tc.tableName}>{card.tableName}</Text>
          <View style={tc.availBadge}>
            <View style={tc.availDot} />
            <Text style={tc.availText}>{t("chat.available")}</Text>
          </View>
        </View>

        {/* Features */}
        {card.features?.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            {card.features.map((f, i) => (
              <View key={i} style={tc.featureChip}>
                <Text style={tc.featureText}>{f}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {card.description ? (
          <Text style={tc.desc} numberOfLines={2}>
            {card.description}
          </Text>
        ) : null}

        {/* Capacity + deposit */}
        <View style={tc.footerRow}>
          <View style={tc.footerLeft}>
            <View style={tc.metaItem}>
              <Ionicons name="people-outline" size={13} color="#9CA3AF" />
              <Text style={tc.metaText}>
                {card.capacity.min}–{card.capacity.max} người
              </Text>
            </View>
            <View style={tc.metaItem}>
              <Ionicons name="wallet-outline" size={13} color="#9CA3AF" />
              <Text style={tc.metaText}>
                {t("chat.deposit")} {card.deposit.toLocaleString("vi-VN")}đ
              </Text>
            </View>
          </View>

          {/* Book button — ẩn nếu bàn đã được đặt */}
          {card.isAvailable !== false ? (
            <TouchableOpacity
              style={tc.bookBtn}
              onPress={() => onBook(card)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#FFD109", "#FF8F1F"]}
                style={tc.bookBtnInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={tc.bookBtnText}>{t("chat.selectTable")}</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[tc.bookBtn, { backgroundColor: "#F3F4F6", padding: 10, alignItems: "center", borderRadius: 10 }]}>
              <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", color: "#9CA3AF" }}>Đã có người đặt</Text>
            </View>
          )}
        </View>
      </View>

      {/* Image Gallery Modal */}
      <Modal visible={showGallery} transparent animationType="fade">
        <View style={gal.overlay}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={gal.header}>
              <Text style={gal.headerTitle}>
                {card.tableName} — {card.restaurantName}
              </Text>
              <TouchableOpacity
                onPress={() => setShowGallery(false)}
                style={gal.closeBtn}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Images */}
            <FlatList
              data={allImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={galleryIdx}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={{ width: SW, height: SW * 0.75 }}
                  resizeMode="cover"
                />
              )}
              onMomentumScrollEnd={(e) => {
                setGalleryIdx(Math.round(e.nativeEvent.contentOffset.x / SW));
              }}
            />

            {/* Dots */}
            <View style={gal.dots}>
              {allImages.map((_, i) => (
                <View
                  key={i}
                  style={[gal.dot, i === galleryIdx && gal.dotActive]}
                />
              ))}
            </View>

            {/* Book from gallery */}
            <TouchableOpacity
              style={gal.bookBtn}
              onPress={() => {
                setShowGallery(false);
                onBook(card);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#FFD109", "#FF8F1F"]}
                style={gal.bookBtnInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={gal.bookBtnText}>{t("chat.bookNow")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Chat Screen ─────────────────────────────────────────────────────────

export default function ChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: t("chat.welcomeMessage"),
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [session, setSession] = useState<AISession>(DEFAULT_SESSION);
  const [userContext, setUserContext] = useState("");
  const { user } = useAuthStore();
  const { location } = useLocation();

  // Tạo context cho AI: vị trí GPS + lịch sử đặt bàn
  useEffect(() => {
    const parts: string[] = [];

    // GPS location
    if (location) {
      parts.push(`Vị trí GPS hiện tại: lat=${location.lat}, lng=${location.lng}. Khi người dùng nói "gần đây", "quanh đây", "gần tôi" → dùng vị trí này, KHÔNG hỏi lại khu vực.`);
    }

    if (!user?._id) {
      setUserContext(parts.join("\n"));
      return;
    }

    bookingAPI.getUserBookings(user._id)
      .then((res) => {
        const bookings = (res.data?.bookings || []).slice(0, 20);
        if (bookings.length > 0) {
          const names = [...new Set(bookings.map((b: any) => b.restaurantId?.name).filter(Boolean))];
          const cuisines = [...new Set(bookings.map((b: any) => b.restaurantId?.cuisine).filter(Boolean))];
          parts.push(`Người dùng này đã đặt bàn ${bookings.length} lần.${
            names.length > 0 ? ` Nhà hàng từng ghé: ${names.join(", ")}.` : ""
          }${
            cuisines.length > 0 ? ` Ẩm thực ưa thích: ${cuisines.join(", ")}.` : ""
          }`);
        }
        setUserContext(parts.join("\n"));
      })
      .catch(() => setUserContext(parts.join("\n")));
  }, [user?._id, location]);

  // Khôi phục lịch sử chat khi mở app
  useEffect(() => {
    AsyncStorage.getItem("amble_chat_history").then((saved) => {
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.messages?.length > 0) {
            setMessages(data.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            if (data.session) setSession(data.session);
          }
        } catch {}
      }
    });
  }, []);

  // Lưu lịch sử chat mỗi khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 1) {
      const save = messages.slice(-50); // Giới hạn 50 tin nhắn gần nhất
      AsyncStorage.setItem("amble_chat_history", JSON.stringify({ messages: save, session })).catch(() => {});
    }
  }, [messages, session]);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const sendMessage = async (customText?: string) => {
    const text = (customText ?? inputText).trim();
    if (!text || loading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    scrollToBottom();

    try {
      const { response, session: newSession } = await ambleAI.chat(
        text,
        session,
        userContext,
      );
      setSession(newSession);

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        text: response.text,
        sender: "ai",
        timestamp: new Date(),
        quickReplies: response.quickReplies,
        tableCards: response.tableCards,
        bookingContext: response.bookingContext,
        restaurants: response.restaurants,
      };
      setMessages((prev) => [...prev, aiMsg]);
      scrollToBottom();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: t("chat.errorMessage"),
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };


  const takePhoto = async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setInputText((prev) => prev + " [Ảnh: " + result.assets[0].uri + "]");
    }
  };

  const pickImage = async () => {
    setShowAttach(false);
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setInputText((prev) => prev + " [Ảnh: " + result.assets[0].uri + "]");
    }
  };

  const handleBookTable = (card: TableCard, draft: any) => {
    router.push({
      pathname: "/booking/confirm" as any,
      params: {
        restaurantId: card.restaurantId,
        restaurantName: card.restaurantName,
        tableId: card.tableId,
        tableName: card.tableName,
        tableType: card.tableType,
        tableImage: card.tableImage || card.restaurantImage,
        deposit: card.deposit.toString(),
        date: draft?.date || "",
        time: draft?.time || "",
        partySize: (draft?.partySize || 2).toString(),
      },
    });
  };

  // ── Render message ──────────────────────────────────
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";

    return (
      <View style={{ marginBottom: 12 }}>
        <View style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAI]}>
          {/* Bubble */}
          <View
            style={[
              s.bubble,
              isUser ? s.bubbleUser : s.bubbleAI,
              { maxWidth: SW * 0.72 },
            ]}
          >
            <Text
              style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextAI]}
            >
              {item.text}
            </Text>
            <Text style={[s.ts, isUser ? s.tsUser : s.tsAI]}>
              {item.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Table cards — nằm dưới bubble, căn trái cho AI */}
        {!isUser && item.tableCards && item.tableCards.length > 0 && (
          <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
            {item.tableCards.map((card) => (
              <TableCardItem
                key={card.tableId}
                card={card}
                draft={item.bookingContext}
                onBook={(c) => handleBookTable(c, item.bookingContext)}
              />
            ))}
          </View>
        )}

        {/* Simple restaurant results (non-booking search) */}
        {!isUser &&
          item.restaurants &&
          item.restaurants.length > 0 &&
          !item.tableCards && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8, marginLeft: 36 }}
            >
              {item.restaurants.map((r: any) => (
                <TouchableOpacity
                  key={r._id}
                  style={sr.card}
                  onPress={() =>
                    router.push({ pathname: `/restaurant/${r._id}` as any })
                  }
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: r.images?.[0] || r.image }}
                    style={sr.img}
                    resizeMode="cover"
                  />
                  <View style={sr.info}>
                    <Text style={sr.name} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <View style={sr.meta}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={sr.rating}>{r.rating?.toFixed(1)}</Text>
                      <Text style={sr.sep}>•</Text>
                      <Text style={sr.city}>{r.city}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
      </View>
    );
  };

  // ── Initial quick suggestions ────────────────────────

  return (
    <SafeAreaView style={s.container} edges={["left", "right"]}>
      <LinearGradient
        colors={["#FFFFFF", "#FFF3BE"]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
        {/* Header — Figma: back arrow + centered title */}
        <View style={[s.header, { paddingTop: 12 + insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={28} color="#FF8F1F" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => {
              AsyncStorage.removeItem("amble_chat_history").catch(() => {});
              setSession(DEFAULT_SESSION);
              setMessages([{ id: `reset-${Date.now()}`, text: t("chat.resetMessage"), sender: "ai", timestamp: new Date() }]);
            }}
            style={s.resetBtn}
          >
            <Ionicons name="refresh" size={18} color="#8A8787" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        {loading && (
          <View style={s.typing}>
            <View style={s.typingBubble}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={s.typingText}>{t("chat.typing")}</Text>
            </View>
          </View>
        )}

        {/* Input — Figma: 314×42, r=15, white */}
          <View style={s.inputWrap}>
            <TouchableOpacity style={s.plusBtn} onPress={() => setShowAttach(true)}>
              <Ionicons name="add" size={22} color="#8A8787" />
            </TouchableOpacity>
            <View style={s.inputBar}>
              <TextInput
                style={s.input}
                placeholder="Hỏi Munchy"
                placeholderTextColor="#8A8787"
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!loading}
                onSubmitEditing={() => sendMessage()}
              />
              <TouchableOpacity style={s.micBtn}>
                <Ionicons name="mic-outline" size={20} color="#FF8F1F" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[s.sendBtn, (!inputText.trim() || loading) && s.sendBtnOff]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={18} color={inputText.trim() && !loading ? "#fff" : "#C4C4C4"} />
            </TouchableOpacity>
          </View>
      </KeyboardAvoidingView>
      </LinearGradient>

      {/* Attach Modal — Figma Rectangle 93 */}
      <Modal visible={showAttach} transparent animationType="fade" onRequestClose={() => setShowAttach(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }} activeOpacity={1} onPress={() => setShowAttach(false)}>
          <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
            <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, width: 282, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 6, marginBottom: 20 }}>
              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }} onPress={takePhoto}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 4 }}>
                  <Ionicons name="camera-outline" size={22} color="#FF8F1F" />
                </View>
                <Text style={{ fontSize: 16, color: "#555" }}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }} onPress={pickImage}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 4 }}>
                  <Ionicons name="images-outline" size={22} color="#FF8F1F" />
                </View>
                <Text style={{ fontSize: 16, color: "#555" }}>Chọn ảnh trong thư viện</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF3BE" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, color: "#8A8787", fontFamily: "Montserrat_400Regular", fontWeight: "400", fontFamily: "Montserrat_400Regular" },
  headerSub: { fontSize: 16, color: "#8A8787", fontFamily: "Montserrat_400Regular", fontWeight: "400", fontFamily: "Montserrat_400Regular", marginTop: 2 },
  resetBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAI: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  aiAvatarImg: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF8F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { padding: 12, borderRadius: 18 },
  bubbleUser: { backgroundColor: "#FF8F1F", borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: "#fff" },
  bubbleTextAI: { color: "#1A1A1A" },
  ts: { fontSize: 10, marginTop: 4 },
  tsUser: { color: "rgba(255,255,255,0.65)", textAlign: "right" },
  tsAI: { color: "#9CA3AF" },


  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  typingAvatarImg: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  typingText: { fontSize: 12, color: "#9CA3AF" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 50,
    backgroundColor: "transparent",
  },
  plusBtn: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  inputBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    height: 48,
    paddingLeft: 14,
    paddingRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  input: { flex: 1, fontSize: 16, color: "#1A1A1A", maxHeight: 100, paddingTop: 0, paddingBottom: 0, fontFamily: "Montserrat_400Regular" },
  micBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sendBtn: {
    width: 41,
    height: 37,
    borderRadius: 15,
    backgroundColor: "#FF8F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { backgroundColor: "#D1D5DB" },
});

// Table card styles
const tc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    width: SW - 68,
    alignSelf: "flex-start",
  },
  restHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  restAvatar: { width: 32, height: 32, borderRadius: 8 },
  restName: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },
  restMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  restRating: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#F59E0B" },
  restSep: { fontSize: 10, color: "#D1D5DB" },
  restCity: { fontSize: 11, color: "#9CA3AF" },
  tableImg: { width: "100%", height: 160 },
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeBadgeText: { fontSize: 11, fontFamily: "Montserrat_700Bold", fontWeight: "700" },
  galleryBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  galleryCount: { fontSize: 11, color: "#fff", fontFamily: "Montserrat_500Medium", fontFamily: "Montserrat_500Medium", fontWeight: "500" },
  body: { padding: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tableName: { fontSize: 15, fontFamily: "Montserrat_700Bold", fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  availText: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#065F46" },
  featureChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  featureText: { fontSize: 11, color: "#6B7280" },
  desc: { fontSize: 12, color: "#9CA3AF", lineHeight: 17, marginBottom: 8 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  footerLeft: { gap: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#6B7280" },
  bookBtn: { borderRadius: 10, overflow: "hidden" },
  bookBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookBtnText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#fff" },
});

// Simple restaurant card styles
const sr = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  img: { width: "100%", height: 90 },
  info: { padding: 8 },
  name: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#F59E0B" },
  sep: { fontSize: 10, color: "#D1D5DB" },
  city: { fontSize: 11, color: "#9CA3AF" },
});

// Gallery styles
const gal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold", fontWeight: "700",
    color: "#fff",
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: { backgroundColor: "#fff", width: 18 },
  bookBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  bookBtnInner: { paddingVertical: 14, alignItems: "center" },
  bookBtnText: { fontSize: 16, fontFamily: "Montserrat_700Bold", fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#fff" },
});
