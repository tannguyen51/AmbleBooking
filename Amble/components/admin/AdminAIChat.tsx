import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, Modal, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminAPI } from "../../services/api";

const PRIMARY = "#FF6B35";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AdminAIChat() {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Chào bạn! Tôi là trợ lý AI phân tích dữ liệu. Hỏi tôi về:\n• Doanh thu hôm nay, tháng này\n• Top nhà hàng, booking, đối tác\n• Tính toán tỉ lệ, trung bình, xu hướng\n• Gợi ý cải thiện kinh doanh" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await adminAPI.aiChat(newMessages);
      if (res.data?.success) {
        setMessages([...newMessages, { role: "assistant", content: res.data.text }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: "Xin lỗi, không thể xử lý yêu cầu." }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Lỗi kết nối. Thử lại sau." }]);
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
            <View style={{ width: 24 }} />
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
