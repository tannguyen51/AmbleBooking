import React, { useRef, useState } from "react";
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
import { Path, Svg } from "react-native-svg";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ambleAI,
  AISession,
  DEFAULT_SESSION,
  TableCard,
  QuickReply,
} from "@/services/ambleAI";
import { ChatMessage } from "@/types/chat";

const PRIMARY = "#ff8b25";
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
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const typeConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    vip: { label: "VIP", color: "#9333EA", bg: "#FAF5FF" },
    view: { label: "View đẹp", color: "#3B82F6", bg: "#EFF6FF" },
    regular: { label: "Thường", color: "#22C55E", bg: "#F0FDF4" },
    standard: { label: "Thường", color: "#22C55E", bg: "#F0FDF4" },
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
            <Text style={tc.availText}>Còn trống</Text>
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
                Cọc {(card.deposit / 1000).toFixed(0)}k
              </Text>
            </View>
          </View>

          {/* Book button */}
          <TouchableOpacity
            style={tc.bookBtn}
            onPress={() => onBook(card)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#FF6B35", "#FFD700"]}
              style={tc.bookBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={tc.bookBtnText}>Chọn bàn này</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
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
                colors={["#FF6B35", "#FFD700"]}
                style={gal.bookBtnInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={gal.bookBtnText}>Đặt bàn này ngay</Text>
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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Xin chào! Mình là **Amble AI**.\n\nMình có thể giúp bạn tìm nhà hàng và đặt bàn chỉ trong vài bước.\n\nBạn muốn:\n• Tìm nhà hàng theo sở thích\n• Đặt bàn nhanh qua chat\n\nNhắn gì đó để bắt đầu nhé! 🍽️",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<AISession>(DEFAULT_SESSION);

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
          text: "⚠️ Có lỗi xảy ra, bạn thử lại nhé!",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (reply: QuickReply) => sendMessage(reply.value);

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
          {/* AI avatar */}
          {!isUser && (
            <LinearGradient
              colors={["#ff8b25", "#FFD700"]}
              style={s.aiAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff">
                <Path d="m22.5,9h-.5v-1c0-2.757-2.243-5-5-5h-4V1c0-.552-.447-1-1-1s-1,.448-1,1v2h-4c-2.757,0-5,2.243-5,5v1h-.5c-.827,0-1.5.673-1.5,1.5v3c0,.827.673,1.5,1.5,1.5h.5v1c0,2.757,2.243,5,5,5h7.697l3.963,2.642c.36.24.775.361,1.191.361.348,0,.696-.084,1.015-.255.699-.375,1.134-1.1,1.134-1.894v-6.855h.5c.827,0,1.5-.673,1.5-1.5v-3c0-.827-.673-1.5-1.5-1.5Zm-14-1c.828,0,1.5.672,1.5,1.5s-.672,1.5-1.5,1.5-1.5-.672-1.5-1.5.672-1.5,1.5-1.5Zm8.031,7.573c-1.037.651-2.666,1.427-4.531,1.427s-3.494-.776-4.531-1.427c-.468-.293-.609-.911-.315-1.378.294-.467.911-.609,1.378-.316.815.512,2.079,1.121,3.469,1.121s2.653-.609,3.469-1.121c.466-.294,1.085-.152,1.378.316.294.468.152,1.085-.315,1.378Zm-1.031-4.573c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Z" />
              </Svg>
            </LinearGradient>
          )}

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

          {/* User avatar */}
          {isUser && (
            <View style={s.userAvatar}>
              <Ionicons name="person" size={14} color="#fff" />
            </View>
          )}
        </View>

        {/* Quick replies */}
        {!isUser && item.quickReplies && item.quickReplies.length > 0 && (
          <View style={s.qrRow}>
            {item.quickReplies.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={s.qrChip}
                onPress={() => handleQuickReply(r)}
                activeOpacity={0.7}
              >
                <Text style={s.qrText}>{r.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Table cards */}
        {!isUser && item.tableCards && item.tableCards.length > 0 && (
          <View style={{ marginTop: 8, marginLeft: 36 }}>
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
  const suggestions = [
    "Tìm nhà hàng gần đây",
    "Đặt bàn hẹn hò",
    "Đặt bàn gia đình",
    "Nhà hàng họp mặt",
  ];

  return (
    <SafeAreaView style={s.container} edges={["left", "right"]}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <LinearGradient
          colors={["#ffd109", "#ff8b25"]}
          style={[s.header, { paddingTop: 12 + insets.top }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={s.headerLeft}>
            <View style={s.headerAvatar}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FF6B35">
                <Path d="m22.5,9h-.5v-1c0-2.757-2.243-5-5-5h-4V1c0-.552-.447-1-1-1s-1,.448-1,1v2h-4c-2.757,0-5,2.243-5,5v1h-.5c-.827,0-1.5.673-1.5,1.5v3c0,.827.673,1.5,1.5,1.5h.5v1c0,2.757,2.243,5,5,5h7.697l3.963,2.642c.36.24.775.361,1.191.361.348,0,.696-.084,1.015-.255.699-.375,1.134-1.1,1.134-1.894v-6.855h.5c.827,0,1.5-.673,1.5-1.5v-3c0-.827-.673-1.5-1.5-1.5Zm-14-1c.828,0,1.5.672,1.5,1.5s-.672,1.5-1.5,1.5-1.5-.672-1.5-1.5.672-1.5,1.5-1.5Zm8.031,7.573c-1.037.651-2.666,1.427-4.531,1.427s-3.494-.776-4.531-1.427c-.468-.293-.609-.911-.315-1.378.294-.467.911-.609,1.378-.316.815.512,2.079,1.121,3.469,1.121s2.653-.609,3.469-1.121c.466-.294,1.085-.152,1.378.316.294.468.152,1.085-.315,1.378Zm-1.031-4.573c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Z" />
              </Svg>
            </View>
            <View>
              <Text style={s.headerTitle}>Amble AI</Text>
              <View style={s.headerOnline}>
                <View style={s.onlineDot} />
                <Text style={s.headerSub}>Luôn sẵn sàng hỗ trợ</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSession(DEFAULT_SESSION);
              setMessages([
                {
                  id: `reset-${Date.now()}`,
                  text: "🔄 Đã reset! Bạn muốn tìm gì?",
                  sender: "ai",
                  timestamp: new Date(),
                },
              ]);
            }}
            style={s.resetBtn}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

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
            <LinearGradient
              colors={["#FF6B35", "#FFD700"]}
              style={s.typingAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
                <Path d="m22.5,9h-.5v-1c0-2.757-2.243-5-5-5h-4V1c0-.552-.447-1-1-1s-1,.448-1,1v2h-4c-2.757,0-5,2.243-5,5v1h-.5c-.827,0-1.5.673-1.5,1.5v3c0,.827.673,1.5,1.5,1.5h.5v1c0,2.757,2.243,5,5,5h7.697l3.963,2.642c.36.24.775.361,1.191.361.348,0,.696-.084,1.015-.255.699-.375,1.134-1.1,1.134-1.894v-6.855h.5c.827,0,1.5-.673,1.5-1.5v-3c0-.827-.673-1.5-1.5-1.5Zm-14-1c.828,0,1.5.672,1.5,1.5s-.672,1.5-1.5,1.5-1.5-.672-1.5-1.5.672-1.5,1.5-1.5Zm8.031,7.573c-1.037.651-2.666,1.427-4.531,1.427s-3.494-.776-4.531-1.427c-.468-.293-.609-.911-.315-1.378.294-.467.911-.609,1.378-.316.815.512,2.079,1.121,3.469,1.121s2.653-.609,3.469-1.121c.466-.294,1.085-.152,1.378.316.294.468.152,1.085-.315,1.378Zm-1.031-4.573c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Z" />
              </Svg>
            </LinearGradient>
            <View style={s.typingBubble}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={s.typingText}>Đang tìm kiếm...</Text>
            </View>
          </View>
        )}

        {/* Input */}
        <View style={s.inputBar}>
          {messages.length === 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.inputSuggestions}
            >
              {suggestions.map((s_, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.suggestionChip}
                  onPress={() => sendMessage(s_)}
                  activeOpacity={0.7}
                >
                  <Text style={s.suggestionText}>{s_}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Nhắn Amble AI..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!loading}
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                (!inputText.trim() || loading) && s.sendBtnOff,
              ]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-forward"
                size={20}
                color={inputText.trim() && !loading ? "#fff" : "#C4C4C4"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  headerOnline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAI: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { padding: 12, borderRadius: 18 },
  bubbleUser: { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
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

  qrRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    marginLeft: 34,
  },
  qrChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  qrText: { fontSize: 13, color: PRIMARY, fontWeight: "600" },

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
    alignItems: "center",
    justifyContent: "center",
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
  inputSuggestions: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  suggestionText: { fontSize: 13, color: "#374151", fontWeight: "500" },

  inputBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ECEFF3",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF0F3",
    borderRadius: 999,
    marginHorizontal: 16,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
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
  restName: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  restMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  restRating: { fontSize: 11, fontWeight: "600", color: "#F59E0B" },
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
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
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
  galleryCount: { fontSize: 11, color: "#fff", fontWeight: "600" },
  body: { padding: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tableName: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
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
  availText: { fontSize: 11, fontWeight: "600", color: "#065F46" },
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
  bookBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
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
  name: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontSize: 11, fontWeight: "600", color: "#F59E0B" },
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
    fontWeight: "700",
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
  bookBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});
