# FreshPlate Mobile Frontend (React Native & Expo)

Cross-platform mobile application for **FreshPlate**, integrating native camera and photo library access to scan grocery receipts and refrigerator shelves using Google Gemini Vision.

---

## 📱 Features

1. **Native Camera & Gallery Capture**:
   - `expo-camera` & `expo-image-picker` with native permission prompting.
   - Preserves full receipt aspect ratios with optimized JPEG quality (`0.85`).
2. **App Store & Google Play Policy Compliance**:
   - Strict `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, and `NSPhotoLibraryAddUsageDescription` defined in `app.json` and `Info.plist`.
   - Granular Android 13+ `READ_MEDIA_IMAGES` and legacy camera permissions in `AndroidManifest.xml`.
3. **Multipart FormData Upload Utility**:
   - Seamlessly converts native device photo URIs (`file://` / `content://`) into standard multipart `FormData` boundary payloads.
   - Dispatches requests to the secure backend route `/api/v1/analyze-ingredients` (as well as `/api/v1/scan-receipt` and `/api/v1/scan-fridge`).
4. **Resilient AI Quality Feedback**:
   - Displays real-time warnings and tips if images are blurry, underexposed, or poorly lit.

---

## 📂 Project Structure

```text
mobile/
├── app.json                       # Expo configuration with App Store & Play Store permissions
├── package.json                   # Dependencies & build scripts
├── tsconfig.json                  # TypeScript configuration
├── index.js                       # Root component registration
├── App.tsx                        # Main UI with Scan Mode Switcher & Results View
├── ios/
│   └── FreshPlate/
│       └── Info.plist             # Native iOS permissions (NSCameraUsageDescription, etc.)
├── android/
│   └── app/
│       └── src/main/
│           └── AndroidManifest.xml # Native Android camera & storage permissions
└── src/
    ├── config/
    │   └── env.ts                 # Dynamic API URL resolution (10.0.2.2 vs localhost)
    ├── hooks/
    │   └── useImageCapture.ts     # Native hook for Camera & Gallery permissions + capture
    ├── services/
    │   └── api.ts                 # FormData multipart upload utility
    └── types/
        └── index.ts               # TypeScript data models
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Start Expo Development Server
```bash
npm start
# or:
npx expo start
```

* Press `i` to open in **iOS Simulator** (uses `http://localhost:3000`).
* Press `a` to open in **Android Emulator** (uses `http://10.0.2.2:3000`).
* Scan QR code with the **Expo Go** app on your physical iOS or Android phone.

---

## 📡 API Endpoints Consumed

* `POST /api/v1/analyze-ingredients`: Fast multi-item pantry ingestion.
* `POST /api/v1/scan-receipt`: Grocery bill OCR normalization, category mapping & shelf life.
* `POST /api/v1/scan-fridge`: Refrigerator shelf object detection & spatial placement.
