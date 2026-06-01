export const meta = {
  name: "i18n-migration",
  description: "Update all screens to use centralized i18n system",
  phases: [
    { title: "Auth screens" },
    { title: "Tab screens" },
    { title: "Booking screens" },
    { title: "Partner screens" },
    { title: "Admin screens" },
    { title: "Other screens" },
  ],
};

const t = (await import("e:/Amble/AmbleBooking1/Amble/i18n/translations.ts")).default;

function buildReplacements(fileContent) {
  // This function scans file content and builds replacement map
  return [];
}

// Phase 1: Auth screens
phase("Auth screens");

const AUTH_FILES = [
  { path: "e:/Amble/AmbleBooking1/Amble/app/(auth)/login.tsx", key: "login" },
  { path: "e:/Amble/AmbleBooking1/Amble/app/(auth)/register.tsx", key: "register" },
  { path: "e:/Amble/AmbleBooking1/Amble/app/(auth)/forgot-password.tsx", key: "forgot" },
  { path: "e:/Amble/AmbleBooking1/Amble/app/(auth)/reset-password.tsx", key: "reset" },
];

await agent(`Update the login screen at e:/Amble/AmbleBooking1/Amble/app/(auth)/login.tsx to use the centralized i18n system.

The i18n system has:
1. A hook: import { useTranslation } from "../../i18n/useTranslation" - provides { t, isEnglish }
2. A translations file with keys like "auth.login.title", "auth.login.emailLabel", etc.

Usage: const { t } = useTranslation(); then use t("auth.login.title") instead of hardcoded string.

The translations file has these login-related keys:
- auth.login.title = "Chào mừng trở lại!" / "Welcome back!"
- auth.login.subtitle = "Đăng nhập để tiếp tục hành trình của bạn" / "Sign in to continue your journey"
- auth.login.emailLabel = "Email"
- auth.login.emailPlaceholder = "your@email.com"
- auth.login.passwordLabel = "Mật khẩu" / "Password"
- auth.login.passwordPlaceholder = "Nhập mật khẩu" / "Enter password"
- auth.login.forgotPassword = "Quên mật khẩu?" / "Forgot password?"
- auth.login.loginButton = "Đăng nhập" / "Sign In"
- auth.login.noAccount = "Chưa có tài khoản? " / "Don't have an account? "
- auth.login.registerNow = "Đăng ký ngay" / "Register Now"
- auth.login.googleSignIn = "Sign in with Google"
- auth.login.tagline = "Khám phá hành trình của bạn" / "Explore your journey"
- common.error = "Lỗi" / "Error"
- auth.login.emptyFields = "Vui lòng nhập email và mật khẩu" / "Please enter email and password"
- auth.login.failed = "Đăng nhập thất bại" / "Login failed"

Replace ALL hardcoded Vietnamese text strings in this file with t("key") calls.
- Add import: import { useTranslation } from "../../i18n/useTranslation"
- Call const { t } = useTranslation() inside the component
- Replace all JSX text with t("key") calls
- Don't change styles, imports (except adding the i18n import), or component structure
- Make sure to handle template strings properly`, { phase: "Auth screens", agentType: "general-purpose", label: "login" });

await agent(`Update the register screen at e:/Amble/AmbleBooking1/Amble/app/(auth)/register.tsx to use the centralized i18n system.

Usage: import { useTranslation } from "../../i18n/useTranslation"; const { t } = useTranslation();

Auth register keys available:
- auth.register.title, auth.register.subtitle, auth.register.stepHint
- auth.register.fullNameLabel, auth.register.fullNamePlaceholder
- auth.register.emailLabel, auth.register.phoneLabel, auth.register.phoneOptional, auth.register.phonePlaceholder
- auth.register.passwordLabel, auth.register.passwordPlaceholder
- auth.register.passwordWeak, auth.register.passwordMedium, auth.register.passwordStrong
- auth.register.confirmPasswordLabel, auth.register.confirmPasswordPlaceholder, auth.register.passwordMismatch
- auth.register.termsPrefix, auth.register.termsOfService, auth.register.privacyPolicy
- auth.register.registerButton, auth.register.hasAccount, auth.register.loginLink
- common.error, common.success
- auth.register.nameRequired, auth.register.emailInvalid, auth.register.passwordMinLength, auth.register.termsRequired, auth.register.defaultError

Replace ALL Vietnamese strings. Don't change logic or structure.`, { phase: "Auth screens", agentType: "general-purpose", label: "register" });

await agent(`Update the forgot-password screen at e:/Amble/AmbleBooking1/Amble/app/(auth)/forgot-password.tsx to use the centralized i18n system.

Usage: import { useTranslation } from "../../i18n/useTranslation"; const { t } = useTranslation();

Keys:
- auth.forgot.title, auth.forgot.subtitle, auth.forgot.emailLabel, auth.forgot.emailPlaceholder, auth.forgot.sendButton
- common.error, common.success
- auth.forgot.successMessage, auth.forgot.failedMessage

Replace ALL Vietnamese strings.`, { phase: "Auth screens", agentType: "general-purpose", label: "forgot-password" });

await agent(`Update the reset-password screen at e:/Amble/AmbleBooking1/Amble/app/(auth)/reset-password.tsx to use the centralized i18n system.

Usage: import { useTranslation } from "../../i18n/useTranslation"; const { t } = useTranslation();

Keys:
- auth.reset.title, auth.reset.subtitle, auth.reset.codeLabel, auth.reset.codePlaceholder
- auth.reset.newPasswordLabel, auth.reset.newPasswordPlaceholder
- auth.reset.confirmLabel, auth.reset.confirmPlaceholder, auth.reset.updateButton
- common.error, common.success
- auth.reset.successMessage, auth.reset.failedMessage
- auth.register.passwordMinLength (for "Mật khẩu tối thiểu 6 ký tự")
- auth.register.passwordMismatch (for "Mật khẩu xác nhận không khớp")

Replace ALL Vietnamese strings.`, { phase: "Auth screens", agentType: "general-purpose", label: "reset-password" });

// Phase 2: Tab screens
phase("Tab screens");

await agent(`Update the home screen at e:/Amble/AmbleBooking1/Amble/app/(tabs)/index.tsx to use the centralized i18n system.

Usage: import { useTranslation } from "../../i18n/useTranslation"; const { t } = useTranslation();

Keys available (home.*):
- home.greetingPrefix, home.greetingMorning, home.greetingAfternoon, home.greetingEvening, home.greetingFallback, home.greetingSubtitle
- home.searchPlaceholder
- home.sectionFeatured, home.sectionDate, home.sectionAll, home.sectionBudget, home.sectionFavorites
- home.filterTitle, home.filterSubtitle, home.filterLocation, home.filterNearby, home.filterDistrict, home.filterPlace
- home.filterDistrictPlaceholder, home.filterPlacePlaceholder, home.filterDistance, home.filterDateTime, home.filterDate, home.filterTime, home.filterAvailable
- home.filterPrice, home.filterPurpose, home.filterRating, home.filterSort, home.filtering, home.filterCount
- home.priceUnder100k, home.price100to300k, home.price300to500k, home.priceOver500k
- home.distUnder1km, home.distUnder3km, home.distUnder5km
- home.sortRating, home.sortReviews, home.sortName
- home.badgeFeatured, home.badgeTrending, home.parking, home.reviews
- home.emptyTitle, home.emptyText, home.clearFilter
- home.categoryNearby, home.categoryDate, home.categoryFamily, home.categoryBusiness, home.categoryGroup, home.categoryBirthday
- home.purposeDate, home.purposeBirthday, home.purposeFamily, home.purposeFriends, home.purposeWork, home.purposeBusiness, home.purposeChill, home.purposeFineDining
- home.peopleUnit, home.peopleNow

Replace ALL Vietnamese text strings. For the greeting, use template: t("home.greetingPrefix") + t(greeting) + ", " + name + "!" where greeting uses t("home.greetingMorning") etc.
Be thorough - replace EVERY user-facing Vietnamese string.`, { phase: "Tab screens", agentType: "general-purpose", label: "home" });

// Update intro and welcome screens to use centralized i18n
await agent(`Update the intro screen at e:/Amble/AmbleBooking1/Amble/app/intro.tsx to use the centralized i18n system.

Usage: import { useTranslation } from "../i18n/useTranslation"; const { t, isEnglish } = useTranslation();

The current file has its own COPY object. Replace it with t() calls.

Keys:
- intro.headlineVi, intro.headlineEn (choose based on isEnglish)
- intro.tagline (same for both)
- intro.startExploring, intro.chooseLanguage

Also, the "Munchmap" text should keep using the hardcoded text (it's a brand name, not a translation).
Keep the fontFamily: "TAN-NIMBUS" styles.

Simplify: remove the old COPY object and useLanguageStore directly. Replace with:
const { t, isEnglish } = useTranslation();
const headline = isEnglish ? t("intro.headlineEn") : t("intro.headlineVi");`, { phase: "Tab screens", agentType: "general-purpose", label: "intro" });

await agent(`Update the welcome screen at e:/Amble/AmbleBooking1/Amble/app/welcome.tsx to use the centralized i18n system.

Usage: import { useTranslation } from "../i18n/useTranslation"; const { t, isEnglish } = useTranslation();

The current file has its own COPY object. Replace it with t() calls.

Keys:
- welcome.headlineVi, welcome.headlineEn, welcome.taglineVi, welcome.taglineEn
- welcome.rolePrompt, welcome.customerTitle, welcome.customerSubtitle
- welcome.partnerTitle, welcome.partnerSubtitle, welcome.adminTitle, welcome.adminSubtitle
- welcome.or, welcome.register, welcome.changeLanguage

Remove the old COPY object. Replace:
const copyLanguage = language === "en" ? "en" : "vi";
const copy = useMemo(() => COPY[copyLanguage], [copyLanguage]);
with:
const { t, isEnglish } = useTranslation();`, { phase: "Tab screens", agentType: "general-purpose", label: "welcome" });
