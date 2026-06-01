import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MunchMapLogo from "../components/AmbleLogo";
import { AppLanguage, useLanguageStore } from "../store/languageStore";
import { useTranslation } from "../i18n/useTranslation";

type LanguageOption = {
  id: AppLanguage;
  countryCode: string;
  nativeName: string;
  secondaryName: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: "vi",
    countryCode: "VN",
    nativeName: "Việt Nam",
    secondaryName: "Tiếng Việt",
  },
  {
    id: "en",
    countryCode: "GB",
    nativeName: "English",
    secondaryName: "English",
  },
  {
    id: "zh",
    countryCode: "CN",
    nativeName: "Trung Quốc",
    secondaryName: "中文",
  },
  {
    id: "ko",
    countryCode: "KR",
    nativeName: "Hàn Quốc",
    secondaryName: "한국어",
  },
  {
    id: "ja",
    countryCode: "JP",
    nativeName: "Nhật Bản",
    secondaryName: "日本語",
  },
  {
    id: "other",
    countryCode: "OT",
    nativeName: "Khác",
    secondaryName: "Other",
  },
];

const COPY = {
  vi: {
    title: "Select your language / Chọn ngôn ngữ",
    continue: "Tiếp tục",
  },
  en: {
    title: "Select your language / Chọn ngôn ngữ",
    continue: "Continue",
  },
  zh: {
    title: "Select your language / Chọn ngôn ngữ",
    continue: "继续",
  },
  ko: {
    title: "Select your language / Chọn ngôn ngữ",
    continue: "계속",
  },
  ja: {
    title: "Select your language / Chọn ngôn ngữ",
    continue: "続ける",
  },
  other: {
    title: "Select your language / Chọn ngôn ngữ",
    continue: "Continue",
  },
} as const;

export default function LanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setLanguage } = useLanguageStore();

  const [selected, setSelected] = useState<AppLanguage>("vi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gradientMotion = useRef(new Animated.Value(0)).current;
  const orbOneMotion = useRef(new Animated.Value(0)).current;
  const orbTwoMotion = useRef(new Animated.Value(0)).current;
  const orbThreeMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backgroundLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientMotion, {
          toValue: 1,
          duration: 6800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(gradientMotion, {
          toValue: 0,
          duration: 6800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const orbOneLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOneMotion, {
          toValue: 1,
          duration: 7200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbOneMotion, {
          toValue: 0,
          duration: 7200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const orbTwoLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbTwoMotion, {
          toValue: 1,
          duration: 9100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbTwoMotion, {
          toValue: 0,
          duration: 9100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const orbThreeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbThreeMotion, {
          toValue: 1,
          duration: 7800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbThreeMotion, {
          toValue: 0,
          duration: 7800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    backgroundLoop.start();
    orbOneLoop.start();
    orbTwoLoop.start();
    orbThreeLoop.start();

    return () => {
      backgroundLoop.stop();
      orbOneLoop.stop();
      orbTwoLoop.stop();
      orbThreeLoop.stop();
    };
  }, [gradientMotion, orbOneMotion, orbTwoMotion, orbThreeMotion]);

  const copy = useMemo(() => COPY[selected], [selected]);
  const gradientTranslateY = gradientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 16],
  });
  const orbOneTranslateY = orbOneMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -24],
  });
  const orbTwoTranslateY = orbTwoMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 22],
  });
  const orbThreeTranslateY = orbThreeMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -14],
  });

  const handleContinue = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await setLanguage(selected);
      router.replace("/intro");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateY: gradientTranslateY }, { scale: 1.16 }],
          },
        ]}
      >
        <LinearGradient
          colors={["#ff8b25", "#ffd109", "#ffb347"]}
          style={styles.gradientFill}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbOne,
          {
            transform: [{ translateY: orbOneTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.02)"]}
          style={styles.orbFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTwo,
          {
            transform: [{ translateY: orbTwoTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,214,125,0.33)", "rgba(255,214,125,0.04)"]}
          style={styles.orbFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbThree,
          {
            transform: [{ translateY: orbThreeTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,139,37,0.38)", "rgba(255,139,37,0.03)"]}
          style={styles.orbFill}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.8 }}
        />
      </Animated.View>

      <View style={styles.contentWrap}>
        <View style={styles.headerWrap}>
          <MunchMapLogo size="xl" showText={false} textColor="#FFFFFF" />
          <Text style={styles.brandText}>Munchmap</Text>
          <Text style={styles.headerText}>{copy.title}</Text>
        </View>

        <View style={styles.languageList}>
          {LANGUAGE_OPTIONS.map((item) => {
            const active = selected === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.languageCard}
                activeOpacity={0.9}
                onPress={() => setSelected(item.id)}
              >
                <Text style={styles.countryCode}>{item.countryCode}</Text>

                <View style={styles.languageTextWrap}>
                  <Text style={styles.languageNative}>{item.nativeName}</Text>
                  <Text style={styles.languageSecondary}>
                    {item.secondaryName}
                  </Text>
                </View>

                {active ? (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.checkPlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.continueBtn,
            isSubmitting && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.88}
          disabled={isSubmitting}
        >
          <Text style={styles.continueText}>{copy.continue}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ff8b25",
  },
  gradientFill: {
    flex: 1,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    overflow: "hidden",
  },
  orbOne: {
    width: 230,
    height: 230,
    top: -70,
    right: -55,
  },
  orbTwo: {
    width: 190,
    height: 190,
    top: "34%",
    left: -70,
  },
  orbThree: {
    width: 250,
    height: 250,
    bottom: -105,
    right: -65,
  },
  orbFill: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: 26,
  },
  brandText: {
    marginTop: 14,
    fontSize: 46,
    lineHeight: 60,
    fontFamily: "TAN-NIMBUS",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.16)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerText: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  languageList: {
    marginTop: 10,
    gap: 10,
  },
  languageCard: {
    minHeight: 66,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  countryCode: {
    width: 44,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: "#111",
    marginRight: 1,
  },
  languageTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  languageNative: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "600",
    color: "#ff7a00",
    marginBottom: 1,
  },
  languageSecondary: {
    fontSize: 13,
    color: "#5a5a5a",
    fontWeight: "500",
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ff7a00",
    alignItems: "center",
    justifyContent: "center",
  },
  checkPlaceholder: {
    width: 24,
    height: 24,
  },
  continueBtn: {
    marginTop: "auto",
    borderRadius: 14,
    backgroundColor: "#fff1de",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  continueText: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "700",
  },
});
