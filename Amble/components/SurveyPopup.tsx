import React, { useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { surveyAPI } from "../services/api";

type SourceKey = "tiktok" | "facebook" | "friends_family" | "restaurant" | "google_chplay" | "event";

const OPTIONS: { key: SourceKey; label: string }[] = [
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "friends_family", label: "Bạn bè / Người Thân" },
  { key: "restaurant", label: "Nhà hàng giới thiệu" },
  { key: "google_chplay", label: "Google, CH Play" },
  { key: "event", label: "Chương trình / Sự kiện" },
];

const ICONS: Record<string, string> = {
  tiktok: "logo-tiktok",
  facebook: "logo-facebook",
  friends_family: "people",
  restaurant: "restaurant",
  google_chplay: "logo-google-playstore",
  event: "calendar",
};

interface Props {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

export default function SurveyPopup({ visible, onClose, userId }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (source: SourceKey) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await surveyAPI.submit(source, userId);
    } catch {}
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>Bạn biết đến{"\n"}Munchmap từ đâu?</Text>

          <View style={s.optionsWrap}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={s.option}
                onPress={() => handleSelect(opt.key)}
                activeOpacity={0.7}
                disabled={submitting}
              >
                <Ionicons name={ICONS[opt.key] as any} size={18} color="#6B7280" />
                <Text style={s.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 18.27,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "700",
    color: "#FF8F1F",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 19.18,
  },
  optionsWrap: { gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: "#4B5563",
  },
});
