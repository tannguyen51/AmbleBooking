import React, { useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MunchMapLogo from "../components/AmbleLogo";
import SurveyPopup from "../components/SurveyPopup";
import { useTranslation } from "../i18n/useTranslation";

const SURVEY_KEY = "amble_survey_done";

export default function IntroScreen() {
  const router = useRouter();
  const { t, isEnglish, language } = useTranslation();
  const [showSurvey, setShowSurvey] = useState(false);

  const handleStart = async () => {
    const done = await AsyncStorage.getItem(SURVEY_KEY);
    if (done === "true") {
      router.push("/welcome");
    } else {
      setShowSurvey(true);
    }
  };

  const handleSurveyClose = async () => {
    setShowSurvey(false);
    await AsyncStorage.setItem(SURVEY_KEY, "true");
    router.push("/welcome");
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#FF8B25", "#FF8F1F", "#FFD109"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* White glow wash — fades into orange gradient */}
      <LinearGradient
        colors={["rgba(255,255,255,0.7)", "rgba(255,255,255,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%" }}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <MunchMapLogo size="xl" showText={false} />
          <Text style={styles.brand}>Munchmap</Text>
        </View>

        <Text style={styles.headline}>Khám phá món ngon{"\n"}theo cách thông minh hơn</Text>

        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.88}
            onPress={handleStart}
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

      <SurveyPopup visible={showSurvey} onClose={handleSurveyClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ff8b25",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 250,
    paddingBottom: 60,
    justifyContent: "space-between",
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
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "500",
    fontFamily: "Montserrat_500Medium",
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
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  primaryBtnText: {
    fontSize: 18,
    color: "#FF8F1F",
    fontWeight: "900",
    fontFamily: "Montserrat_700Bold",
  },
  secondaryBtn: {
    height: 54,
    borderRadius: 12,
    marginHorizontal: 8,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: "Montserrat_500Medium",
  },
});
