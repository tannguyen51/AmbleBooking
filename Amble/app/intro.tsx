import React from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import MunchMapLogo from "../components/AmbleLogo";
import { useTranslation } from "../i18n/useTranslation";

export default function IntroScreen() {
  const router = useRouter();
  const { t, isEnglish, language } = useTranslation();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#ff8b25", "#ffd109", "#ffb347"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
      />

      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <MunchMapLogo size="xl" showText={false} />
          <Text style={styles.brand}>Munchmap</Text>
        </View>

        <Text style={styles.headline}>{
          language === "zh" ? "不仅是美食。\n您的体验。" :
          language === "ko" ? "단순한 식사가 아닌.\n당신의 경험." :
          language === "ja" ? "食事だけではない。\nあなたの体験。" :
          isEnglish ? t("intro.headlineEn") : t("intro.headlineVi")
        }</Text>

        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.88}
            onPress={() => router.push("/welcome")}
          >
            <Text style={styles.primaryBtnText}>{t("intro.startExploring")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.88}
            onPress={() => router.replace("/language")}
          >
            <Text style={styles.secondaryBtnText}>{t("intro.chooseLanguage")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ff8b25",
  },
  blobOne: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 224, 166, 0.2)",
    top: 120,
    left: -70,
  },
  blobTwo: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 210, 122, 0.2)",
    top: 160,
    right: -90,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 180,
    paddingBottom: 96,
  },
  logoWrap: {
    alignItems: "center",
    transform: [{ scale: 1.14 }],
  },
  brand: {
    marginTop: 12,
    fontSize: 42,
    lineHeight: 54,
    fontFamily: "TAN-NIMBUS",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headline: {
    marginTop: 34,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  tagline: {
    marginTop: 16,
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  buttonStack: {
    width: "100%",
    marginTop: "auto",
    gap: 14,
  },
  primaryBtn: {
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdfbe3",
  },
  primaryBtnText: {
    fontSize: 20,
    lineHeight: 24,
    color: "#ff7700",
    fontWeight: "900",
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 16,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  secondaryBtnText: {
    fontSize: 17,
    lineHeight: 20,
    color: "#ff8b25",
    fontWeight: "600",
  },
});
