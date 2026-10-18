# FreshPlate Mobile: Apple App Store & Google Play Policy Audit Report

**Auditor:** Mobile DevOps & App Store Compliance Specialist  
**Target Stores:** Apple App Store (iOS 15+) & Google Play Store (Android API 24-34+)  
**Framework:** React Native 0.76 with Expo SDK 52 (TypeScript)  
**Date:** October 2026  
**Status:** **APPROVED FOR SUBMISSION (PASS)**

---

## 1. Apple App Store Review Guidelines Compliance Audit

### Guideline 5.1.1: Data Collection and Storage
- **Requirement:** The app must have a valid Privacy Policy link, describe why permissions are required, and avoid collecting unnecessary data.
- **Audit Finding:** **PASS**
  - Standard Privacy Policy drafted in [`PRIVACY_POLICY.md`](file:///d:/FreshPlate/mobile/PRIVACY_POLICY.md).
  - In-app access provided via [`PrivacyPolicyModal.tsx`](file:///d:/FreshPlate/mobile/src/components/PrivacyPolicyModal.tsx) and [`SettingsScreen.tsx`](file:///d:/FreshPlate/mobile/src/components/SettingsScreen.tsx).
  - Web policy URL declared in [`app.json`](file:///d:/FreshPlate/mobile/app.json#L56) (`https://freshplate.app/privacy`).

### Guideline 5.1.1(v): In-App Account Deletion
- **Requirement:** If an app supports account creation or persistence, it must allow users to initiate account deletion from within the app.
- **Audit Finding:** **PASS**
  - Direct in-app deletion button implemented in [`SettingsScreen.tsx`](file:///d:/FreshPlate/mobile/src/components/SettingsScreen.tsx#L75-L100) with destructive double-confirmation dialog.
  - Complete erasure of stored pantry items, scan history, and user state.
  - Dedicated web deletion URL provided (`https://freshplate.app/delete-account`).

### Guideline 2.1: App Completeness & Error Handling
- **Requirement:** Apps must not crash, display unhandled exceptions, or have dead-end navigation.
- **Audit Finding:** **PASS**
  - Network timeouts guarded with `AbortController` (45-60s timeout bounds) in [`api.ts`](file:///d:/FreshPlate/mobile/src/services/api.ts).
  - Camera permission denial offers a fallback alert linking directly to system settings via `Linking.openSettings()` in [`useImageCapture.ts`](file:///d:/FreshPlate/mobile/src/hooks/useImageCapture.ts#L43).
  - Offline / disconnected mode graceful fallback provided in [`App.tsx`](file:///d:/FreshPlate/mobile/App.tsx#L254-L310).

### Guideline 4.0: Human Interface Guidelines (HIG)
- **Requirement:** Adequate touch targets (min 44x44 pt), Safe Area insets, accessible contrast, and smooth navigation.
- **Audit Finding:** **PASS**
  - `SafeAreaView` implemented on all root views with dark/light status bar styling.
  - Generous touch targets on all buttons, tags, and tabs.
  - Clear typography using high-contrast slate and emerald tones.

### ITSAppUsesNonExemptEncryption
- **Requirement:** Apps submitted to App Store Connect prompt for encryption documentation unless declared exempt.
- **Audit Finding:** **PASS**
  - `<key>ITSAppUsesNonExemptEncryption</key><false/>` declared in [`Info.plist`](file:///d:/FreshPlate/mobile/ios/FreshPlate/Info.plist#L27-L28) and [`app.json`](file:///d:/FreshPlate/mobile/app.json#L19).

---

## 2. Google Play Developer Program Policies Audit

### User Data & Data Safety Section
- **Requirement:** Explicit declaration of data collected, purpose, and third-party sharing.
- **Audit Finding:** **PASS**
  - **Photos/Videos:** Collected ephemerally for app functionality (Receipt OCR and Fridge scanning).
  - **Ephemeral Processing:** Raw photos are not stored permanently.
  - **Data Encryption:** TLS 1.3 / HTTPS in transit, AES-256 in Firestore.
  - **Account Deletion:** In-app path + web URL (`https://freshplate.app/delete-account`) satisfying Google Play console mandates.

### Granular Media Permissions (Android 13+ / API 33+)
- **Requirement:** Avoid broad storage permissions (`MANAGE_EXTERNAL_STORAGE` or unconditional `READ_EXTERNAL_STORAGE`).
- **Audit Finding:** **PASS**
  - `android.permission.READ_MEDIA_IMAGES` utilized for API 33+ in [`AndroidManifest.xml`](file:///d:/FreshPlate/mobile/android/app/src/main/AndroidManifest.xml#L14).
  - Legacy storage permissions scoped with `maxSdkVersion="32"` (`READ_EXTERNAL_STORAGE`) and `maxSdkVersion="29"` (`WRITE_EXTERNAL_STORAGE`).

### Generative AI Policy (Gemini Integration)
- **Requirement:** Clear disclosures when generative AI is used, and user ability to report or modify outputs.
- **Audit Finding:** **PASS**
  - Detailed third-party AI subprocessor disclosures in [`PRIVACY_POLICY.md`](file:///d:/FreshPlate/mobile/PRIVACY_POLICY.md#L32-L52).
  - In-app pantry review screen allows users to edit or delete any AI misidentifications before generating recipes.
  - Explicit terms guaranteeing user images are not used for Google AI foundation model training.

### Production Network Security
- **Requirement:** No cleartext HTTP traffic in production release builds.
- **Audit Finding:** **PASS**
  - Production base URL is strictly HTTPS (`https://api.freshplate.app`) in [`env.ts`](file:///d:/FreshPlate/mobile/src/config/env.ts#L19) and [`eas.json`](file:///d:/FreshPlate/mobile/eas.json#L31).

---

## 3. Production Build & Release Pipeline

EAS configuration file [`eas.json`](file:///d:/FreshPlate/mobile/eas.json) is configured for automated cloud builds and store submissions:

```bash
# Production Android AAB (Google Play)
npm run build:android

# Production iOS Archive (App Store)
npm run build:ios

# Internal Testing Preview APK
npm run build:preview

# Automated Store Submissions
npm run submit:android
npm run submit:ios
```
