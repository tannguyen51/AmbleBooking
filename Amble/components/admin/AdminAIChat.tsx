import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Modal, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { adminAPI } from "../../services/api";

const PRIMARY = "#FF6B35";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const DEFAULT_MSG: Message = {
  role: "assistant",
  content: "Chào bạn! Tôi là trợ lý AI phân tích dữ liệu. Hỏi tôi về:\n• Doanh thu hôm nay, tháng này\n• Top nhà hàng, booking, đối tác\n• Tính toán tỉ lệ, trung bình, xu hướng\n• Gợi ý cải thiện kinh doanh",
  timestamp: new Date().toISOString(),
};

export default function AdminAIChat() {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  // Load lịch sử
  useEffect(() => {
    AsyncStorage.getItem("amble_admin_chat").then((saved) => {
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.messages?.length > 0) setMessages(data.messages);
        } catch {}
      }
    });
  }, []);

  // Save lịch sử
  useEffect(() => {
    if (messages.length > 1) {
      const save = messages.slice(-50);
      AsyncStorage.setItem("amble_admin_chat", JSON.stringify({ messages: save })).catch(() => {});
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
      // Chỉ gửi 10 tin nhắn gần nhất để tránh payload quá lớn
      const payload = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
      console.log("[AdminAI] sending, msgs:", payload.length);
      const res = await adminAPI.aiChat(payload);
      console.log("[AdminAI] response:", JSON.stringify(res.data).slice(0, 300));
      const text = res.data?.success ? res.data.text : "Lỗi kết nối, thử lại sau.";
      const aiMsg: Message = { role: "assistant", content: text || "(empty)", timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      console.log("[AdminAI] exception:", e?.message, e?.response?.data);
      setMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối. Thử lại sau.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity style={s.fab} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>AI Phân tích</Text>
            <TouchableOpacity onPress={resetChat}>
              <Ionicons name="refresh" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={s.list}
            onContentSizeChange={() => flatRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <View style={[s.bubble, item.role === "user" ? s.bubbleUser : s.bubbleAI]}>
                <Text style={[s.bubbleText, item.role === "user" ? s.textUser : s.textAI]}>
                  {item.content}
                </Text>
                <Text style={s.timestamp}>{new Date(item.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            )}
          />

          {/* Input */}
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Hỏi về doanh thu, booking, đối tác..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]} onPress={send} disabled={!input.trim() || loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  modal: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: "85%", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAI: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: PRIMARY },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  textAI: { color: "#1A1A1A" },
  textUser: { color: "#fff" },
  timestamp: { fontSize: 10, color: "#9CA3AF", marginTop: 4, textAlign: "right" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
});
