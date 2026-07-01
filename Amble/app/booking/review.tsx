import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { uploadAPI, restaurantAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n/useTranslation";

const PRIMARY = "#FF6B35";
const MAX_IMAGES = 6;

export default function BookingReviewScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { restaurantId, restaurantName, bookingId } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
    bookingId: string;
  }>();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền truy cập", "Vui lòng cấp quyền thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: Math.max(0, MAX_IMAGES - images.length),
    });

    if (result.canceled) return;

    const next = result.assets
      .map((asset) =>
        asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
      )
      .filter(Boolean);

    setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img !== uri));
  };

  const submitReview = async () => {
    if (!user?._id) {
      Alert.alert(t("common.notification"), t("booking.review.loginRequired"));
      return;
    }

    if (!restaurantId || !bookingId) {
      Alert.alert(t("common.error"), t("booking.review.missingInfo"));
      return;
    }

    try {
      setSubmitting(true);

      // Upload ảnh lên server trước
      const uploadedUrls: string[] = [];
      for (const img of images) {
        if (img.startsWith("data:") || img.startsWith("file://") || img.startsWith("content://")) {
          try {
            const base64 = img.startsWith("data:") ? img : await FileSystem.readAsStringAsync(img, { encoding: FileSystem.EncodingType.Base64 }).then(b => `data:image/jpeg;base64,${b}`);
            const res = await uploadAPI.uploadImage(base64, "reviews");
            if (res.data?.url) uploadedUrls.push(res.data.url);
          } catch { uploadedUrls.push(img); }
        } else {
          uploadedUrls.push(img);
        }
      }

      const res = await restaurantAPI.createReview(restaurantId, {
        rating,
        comment,
        images: uploadedUrls,
        bookingId,
      });
      const earned = res.data?.rewardPoints;
      const msg = earned
        ? `Đánh giá của bạn đã được gửi. Bạn nhận được +${earned} điểm thưởng!`
        : "Đánh giá của bạn đã được gửi.";
      Alert.alert(t("booking.review.thanks"), msg);
      router.replace(`/restaurant/${restaurantId}` as any);
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error?.response?.data?.message || t("booking.review.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("booking.review.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{restaurantName || "Nhà hàng"}</Text>
        <Text style={styles.subtitle}>{t("booking.review.subtitle")}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("booking.review.rating")}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setRating(n)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={n <= rating ? "star" : "star-outline"}
                  size={28}
                  color="#F59E0B"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("booking.review.comment")}</Text>
          <TextInput
            style={styles.textArea}
            placeholder={t("booking.review.commentPlaceholder")}
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            multiline
          />
        </View>

        <View style={styles.card}>
          <View style={styles.imageHeader}>
            <Text style={styles.sectionTitle}>{t("booking.review.images")}</Text>
            <Text style={styles.imageCount}>{images.length}/{MAX_IMAGES}</Text>
          </View>
          <TouchableOpacity style={styles.addImageBtn} onPress={addImages}>
            <Ionicons name="images-outline" size={16} color="#111827" />
            <Text style={styles.addImageText}>{t("booking.review.addImages")}</Text>
          </TouchableOpacity>
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((img) => (
                <View key={img} style={styles.imageWrap}>
                  <Image source={{ uri: img }} style={styles.imageThumb} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(img)}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={submitReview}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t("booking.review.submit")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  content: { padding: 20, paddingBottom: 30, gap: 14 },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  starsRow: { flexDirection: "row", gap: 8 },
  textArea: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    textAlignVertical: "top",
  },
  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageCount: { fontSize: 12, color: "#9CA3AF" },
  addImageBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F9FAFB",
  },
  addImageText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageWrap: { position: "relative" },
  imageThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  submitBtn: {
    marginTop: 6,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
