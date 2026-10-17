# FreshPlate Mobile Release QA & Launch Manual

**Version:** 1.0.0 (Build 1)  
**Package / Bundle ID:** `com.freshplate.app`  
**Target Stores:** Google Play Console & Apple App Store Connect  
**Author:** Lead Mobile QA & Build Engineer  

---

## 1. Release Specification & Platform Targets

| Parameter | Android Specification | iOS Specification |
| :--- | :--- | :--- |
| **Target SDK / Deployment** | **API Level 35 (Android 15)** | **iOS 15.1+** |
| **Compile SDK / Base SDK** | API Level 35 | iOS 17.0+ (Xcode 15/16) |
| **Minimum Supported Version**| API Level 24 (Android 7.0 Nougat) | iOS 15.1 |
| **Artifact Format** | Android App Bundle (`.aab`) | Xcode Archive / IPA (`.ipa`) |
| **Engine / Architecture** | React Native 0.76.7 / Hermes | React Native 0.76.7 / Hermes |
| **Build Configuration** | [mobile/eas.json](file:///d:/FreshPlate/mobile/eas.json) (`production`) | [mobile/eas.json](file:///d:/FreshPlate/mobile/eas.json) (`production`) |
| **Native Manifests** | [AndroidManifest.xml](file:///d:/FreshPlate/mobile/android/app/src/main/AndroidManifest.xml)<br>[build.gradle](file:///d:/FreshPlate/mobile/android/build.gradle) | [Info.plist](file:///d:/FreshPlate/mobile/ios/FreshPlate/Info.plist)<br>[Podfile](file:///d:/FreshPlate/mobile/ios/Podfile) |

---

## 2. Production Artifact Generation Guide

### Option A: Cloud Builds via Expo EAS (Recommended)
Prerequisites: EAS CLI (`npm install -g eas-cli`) and Expo account.

1. **Build Android App Bundle (`.aab`) for Google Play:**
   ```bash
   cd mobile
   eas build --platform android --profile production
   ```
   *Output:* Signed `.aab` file ready for upload to Google Play Console Internal Testing, Closed Testing, or Production track.

2. **Build iOS Archive (`.ipa`) for App Store Connect:**
   ```bash
   cd mobile
   eas build --platform ios --profile production
   ```
   *Output:* Apple-signed `.ipa` uploaded directly to TestFlight and App Store Connect.

3. **Combined Simultaneous Build:**
   ```bash
   cd mobile
   npm run build:all
   ```

4. **Automated Store Submission:**
   ```bash
   cd mobile
   npm run submit:android
   npm run submit:ios
   ```

### Option B: Local Native CLI Builds
1. **Android (`.aab`):**
   ```bash
   cd mobile/android
   ./gradlew :app:bundleRelease
   # Output: android/app/build/outputs/bundle/release/app-release.aab
   ```
2. **iOS (`.ipa`):**
   ```bash
   cd mobile/ios
   pod install
   xcodebuild -workspace FreshPlate.xcworkspace -scheme FreshPlate -configuration Release archive -archivePath ./build/FreshPlate.xcarchive
   ```

---

## 3. Step-by-Step QA Manual Test Protocols

### TC-01: Camera & Photo Permissions Flow on Clean Installs
**Objective:** Verify proper OS permission request flow, descriptive rationale strings, denial fallbacks, and settings redirects.

* **Clean State Initialization:**
  - *Android:* Run `adb shell pm clear com.freshplate.app` or uninstall and reinstall APK/AAB.
  - *iOS:* Delete app from test device and reinstall from TestFlight / Xcode.
* **Test Steps:**
  1. Launch FreshPlate. Observe initial Screen (`Scan`).
  2. Tap **"Take Photo"** button under Receipt Mode.
  3. **Verification 1A (System Prompt):**
     - Verify native camera permission dialog displays.
     - Verify description text matches exact string:  
       `"FreshPlate uses your camera to scan grocery bills and fridge contents to automatically identify ingredients."`
  4. Tap **"Allow"** / **"While using the app"**.
     - Verify native camera viewport opens immediately without crash.
  5. Close camera, tap **"Upload from Gallery"**.
  6. **Verification 1B (Photo Library Prompt):**
     - Verify native media library prompt displays exact string:  
       `"FreshPlate accesses your photos so you can upload saved receipts and food images."`
     - Tap **"Allow"** / **"Select Photos"**.
  7. **Verification 1C (Denial Fallback):**
     - Reinstall or revoke permissions in Settings.
     - Tap "Take Photo" and tap **"Deny"** / **"Don't Allow"**.
     - Verify friendly banner appears: `"Camera access is required to take photos of receipts and pantries."`
     - Revoke permanently ("Don't ask again") and tap "Take Photo".
     - Verify alert modal appears with **"Open Settings"** CTA. Tapping it redirects to OS App Settings.

---

### TC-02: Receipt Scan to Ingredient Extraction Pipeline
**Objective:** Verify image compression, OCR receipt parsing, ingredient extraction, and category categorization.

* **Test Steps:**
  1. Place a printed grocery receipt (supermarket receipt with produce, dairy, bakery items) on a flat surface.
  2. In FreshPlate, select **"Receipt Scan Mode"** (`receipt`).
  3. Capture a high-resolution photo (3000x4000px, ~4MB-8MB original file).
  4. **Verification 2A (Progressive Client Compression):**
     - Observe UI activity spinner: `"Compressing receipt image..."`
     - Verify payload compressed under **2.0MB** (monitored in dev logs or network proxy).
  5. **Verification 2B (AI Extraction via Google Gemini 1.5 Flash):**
     - Observe progress message: `"Analyzing receipt contents with Gemini AI..."`
     - Response time must be $< 6$ seconds under normal 4G/Wi-Fi.
  6. **Verification 2C (Structured Categorization):**
     - User is transitioned to **PantryReviewScreen**.
     - Verify items are automatically categorized into:
       - **Dairy & Eggs:** Milk, Yogurt, Cheese, Butter, Eggs.
       - **Fresh Produce:** Spinach, Apples, Onions, Tomatoes, Garlic.
       - **Pantry Staples:** Flour, Pasta, Rice, Spices, Canned goods.
     - Quantities and units parsed (e.g. `"500g"`, `"1 gal"`, `"3 pcs"`).

---

### TC-03: Fridge Photo Scan to Recipe Matching Pipeline
**Objective:** Verify panoramic fridge contents detection and AI recipe generation with match score calculation.

* **Test Steps:**
  1. Open refrigerator door and select **"Fridge Scan Mode"** (`fridge`).
  2. Take a wide-angle photo capturing multiple shelves with varying light conditions.
  3. Verify client compresses photo strictly $< 2\text{MB}$.
  4. Verify Gemini Vision recognizes visible ingredients (e.g., Eggs, Cheese, Bell Peppers, Milk).
  5. In **PantryReviewScreen**, confirm recognized items and tap **"Generate Recipes"**.
  6. **Verification 3A (Dietary Filters & Match Ranking):**
     - Select dietary preference (e.g., *Vegetarian*, *High-Protein*, *Quick Under 20m*).
     - Verify recipe list ranks recipes by **Match Score (%)** descending (highest match at the top).
  7. **Verification 3B (Missing Ingredient Tagging):**
     - Inspect top recipes:
       - 100% Match recipes show green badge `"Ready to Cook - You have all ingredients"`.
       - $<100\%$ Match recipes display `"Missing: [Olive Oil, Garlic]"`.
     - Tap recipe card to inspect step-by-step cooking directions, prep time, and difficulty.

---

### TC-04: In-App Editable Tags, Manual Item Additions & Offline Persistence
**Objective:** Verify UI item modifications, custom item additions, tag edits, and offline local cache persistence.

* **Test Steps:**
  1. Navigate to **PantryReviewScreen**.
  2. **Add Manual Item:**
     - Tap **"+ Add Ingredient"**.
     - In modal: input Name = `"Organic Chia Seeds"`, Group = `"Pantry Staples"`, Quantity = `"250g"`, toggle Expiring Soon = *False*.
     - Tap **"Add to Pantry"**.
     - Verify `"Organic Chia Seeds"` appears in the Pantry list with tag `Pantry` and badge `Fresh`.
  3. **Edit Existing Item Tag:**
     - Tap on an item (e.g. `"Baby Spinach"`).
     - Change name to `"Organic Baby Spinach Leaves"`, change quantity to `"300g"`, toggle **"Expiring Soon"** to *True*.
     - Tap **"Save Changes"**.
     - Verify item card updates instantly with red warning pill `"Expiring Soon"`.
  4. **Delete Item:**
     - Tap the trash icon on an unwanted item.
     - Confirm deletion in popup dialog. Verify item is removed from view and count decrements.
  5. **Offline Caching & Cold-Start Persistence:**
     - Switch mobile device into **Airplane Mode** (disable Wi-Fi & Cellular).
     - Force-quit the FreshPlate application.
     - Re-launch FreshPlate offline.
     - Navigate to Pantry Review.
     - **Verification 4A:** Verify all edited and manual items (`"Organic Chia Seeds"`, `"Organic Baby Spinach Leaves"`) are fully preserved and loaded from local `AsyncStorage`.
     - **Verification 4B:** Verify offline banner or subtitle displays: `"Last synced: [Date/Time] (Offline Mode)"`.

---

## 4. App Store Submission Pre-Flight Checklist

### Google Play Console Checklist
- [x] **Target API Level:** Set to **API 35** in `app.json`, `build.gradle`, and `expo-build-properties`.
- [x] **Bundle Format:** Production profile builds `.aab` (Android App Bundle).
- [x] **Data Safety Form Disclosures:**
  - *Camera:* Collected for app functionality (scans receipts/fridge), ephemeral processing, not shared with third parties for marketing.
  - *Photos/Videos:* User-initiated photo selection.
  - *AI Disclosures:* Powered by Google Gemini 1.5 Flash Vision. Data is not used for foundation model training.
- [x] **Account Deletion URL:** `https://freshplate.app/delete-account` declared in Play Console Store Presence.

### Apple App Store Connect Checklist
- [x] **iOS Deployment Target:** Set to **15.1** in `app.json`, `Info.plist`, and `Podfile`.
- [x] **Guideline 5.1.1(v) Account Deletion:** Explicit "Delete Account & Clear Data" option present in in-app `SettingsScreen` with permanent data erasure.
- [x] **Guideline 5.1.1(i) Privacy Strings:** `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` describe exact grocery and fridge scanning rationale.
- [x] **Guideline 5.1.2 AI Data Disclosure:** Hosted privacy policy (`https://freshplate.app/privacy`) disclosed in App Store metadata and in-app modal.
- [x] **Encryption Exemption:** `<key>ITSAppUsesNonExemptEncryption</key><false/>` declared in `Info.plist`.

---

## 5. Automated Test Suite Execution

Run the complete test suite from terminal:
```bash
# 1. Run automated release smoke tests (32 assertions)
npm --prefix mobile run test:smoke

# 2. Run app store & Play Store compliance audit (13 assertions)
npm --prefix mobile run test:compliance

# 3. Run mobile systems, compression & offline tests (13 assertions)
npm --prefix mobile run test:systems

# 4. Run entire suite in one command (58 assertions)
npm --prefix mobile run test:all

# 5. Verify zero TypeScript errors
npm --prefix mobile run lint
```
