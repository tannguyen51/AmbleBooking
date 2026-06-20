import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Modal, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { adminAPI } from "../../services/api";

const ACCENT = "#FF8F1F";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const DEFAULT_MSG: Message = {
  role: "assistant",
  content: "Chào bạn! Tôi là Munchy — trợ lý phân tích dữ liệu. Hỏi tôi về:\n• Doanh thu, booking, đối tác\n• Top nhà hàng, xu hướng\n• Báo cáo theo ngày/tuần/tháng\n• Gợi ý cải thiện kinh doanh",
  timestamp: new Date().toISOString(),
};

interface Props {
  showFab?: boolean;
  visible?: boolean;
  onToggle?: (v: boolean) => void;
}

export default function AdminAIChat({ showFab = true, visible: extVisible, onToggle }: Props) {
  const [internalVisible, setInternalVisible] = useState(false);
  const visible = extVisible !== undefined ? extVisible : internalVisible;
  const setVisible = (v: boolean) => {
    if (onToggle) onToggle(v);
    else setInternalVisible(v);
  };
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem("amble_admin_chat").then((saved) => {
      if (saved) {
        try { const data = JSON.parse(saved); if (data.messages?.length > 0) setMessages(data.messages); }
        catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      AsyncStorage.setItem("amble_admin_chat", JSON.stringify({ messages: messages.slice(-50) })).catch(() => {});
    }
  }, [messages]);

  const resetChat = () => {
    setMessages([DEFAULT_MSG]);
    AsyncStorage.removeItem("amble_admin_chat").catch(() => {});
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const now = new Date().toISOString();
    const userMsg: Message = { role: "user", content: text, timestamp: now };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const payload = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await adminAPI.aiChat(payload);
      const reply = res.data?.success ? res.data.text : "Lỗi kết nối, thử lại sau.";
      setMessages(prev => [...prev, { role: "assistant", content: reply || "(empty)", timestamp: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối. Thử lại sau.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMsg = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[s.msgRow, isUser ? s.msgRowRight : s.msgRowLeft]}>
        {!isUser && (
          <View style={s.avatar}>
            <Ionicons name="sparkles" size={16} color={ACCENT} />
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {showFab && (
        <TouchableOpacity style={s.fab} onPress={() => setVisible(true)} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={s.root}>
          <LinearGradient colors={["#FFFFFF", "#FFF3BE"]} style={s.bg} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header — match customer chat */}
            <View style={s.header}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="arrow-back" size={24} color="#FF8F1F" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={s.headerTitle}>Munchy</Text>
                <Text style={s.headerSub}>trợ lý phân tích dữ liệu</Text>
              </View>
              <TouchableOpacity onPress={resetChat}>
                <Ionicons name="refresh" size={20} color="#8A8787" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderMsg}
              contentContainerStyle={s.list}
              onContentSizeChange={() => flatRef.current?.scrollToEnd()}
            />

            {loading && (
              <View style={s.typing}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={s.typingText}>Đang phân tích...</Text>
              </View>
            )}

            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="Hỏi về doanh thu, booking..."
                placeholderTextColor="#8A8787"
                value={input}
                onChangeText={setInput}
                multiline
                onSubmitEditing={send}
              />
              <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]} onPress={send} disabled={!input.trim() || loading}>
                <Ionicons name="arrow-up" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF3BE" },
  bg: { ...StyleSheet.absoluteFillObject },
  fab: {
    position: "absolute", bottom: 90, right: 16, width: 48, height: 48,
    borderRadius: 24, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center",
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },
  headerSub: { fontSize: 11, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#8A8787", marginTop: 1 },
  list: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: "row", marginBottom: 12, gap: 8 },
  msgRowRight: { justifyContent: "flex-end" },
  msgRowLeft: { justifyContent: "flex-start" },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bubble: { padding: 12, borderRadius: 18, maxWidth: "75%" },
  bubbleUser: { backgroundColor: ACCENT, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 14, lineHeight: 20, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#1A1A1A" },
  bubbleTextUser: { color: "#FFFFFF" },
  typing: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  typingText: { fontSize: 12, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#8A8787" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F5F5F5",
    borderRadius: 24, marginHorizontal: 16, marginBottom: 16, paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Montserrat_400Regular", fontWeight: "400", color: "#1A1A1A", maxHeight: 100, paddingVertical: 0 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
});
