# FreshPlate Privacy Policy & AI Data Disclosures

**Last Updated: October 2026**  
**Effective Date: October 2026**

This Privacy Policy governs the collection, use, and disclosure of personal data and image media by the **FreshPlate** mobile application ("FreshPlate", "the App", "we", "us", or "our"), available for iOS and Android devices.

FreshPlate is committed to protecting user privacy, minimizing data collection, and adhering strictly to:
- **Apple App Store Review Guidelines** (including Section 5.1.1 on Data Collection and 5.1.1(v) on In-App Account Deletion).
- **Google Play Developer Program Policies** (including User Data Safety and Generative AI Policies).
- **General Data Protection Regulation (GDPR)** and **California Consumer Privacy Act (CCPA)**.

---

## 1. Information We Collect

### A. Camera & Photo Library Media (Images)
FreshPlate requests access to your device’s native camera and photo library for the sole purpose of enabling core pantry management features:
1. **Grocery Receipts:** High-resolution photographs of printed supermarket paper receipts to extract purchased items, quantities, and prices.
2. **Refrigerator & Pantry Shelves:** Wide-angle photographs of refrigerator shelves, crisper drawers, and pantry storage to detect inventory items.

### B. Extracted Pantry Data
When images are processed, the system extracts:
- Item descriptions and normalized food product names (e.g., "Greek Yogurt", "Spinach").
- Estimated quantities, units, and storage zones (e.g., "500g", "crisper drawer").
- Estimated expiration dates and shelf-life indicators.

### C. Account & Usage Identifiers
If you register for an account or authenticate with Google Sign-In:
- User ID and email address.
- Saved recipes, custom cooking preferences, and allergy exclusions.

---

## 2. Third-Party AI Subprocessors: Google Cloud & Gemini Vision

FreshPlate utilizes advanced artificial intelligence services provided by **Google Cloud Platform (Vertex AI / Google Gemini API)** to perform optical character recognition (OCR), visual object classification, and recipe generation.

### Key AI Safety & Privacy Protections:

1. **Ephemeral In-Memory Processing**:
   - Captured photos are encoded and transmitted over secure TLS 1.3 / HTTPS connections directly to FreshPlate's backend.
   - The backend passes the image buffer in-memory to Google Gemini Vision.
   - **No persistent raw image files are stored on server disk or long-term cloud buckets.** Once the JSON response is generated, image memory buffers are immediately purged.

2. **No Model Training on User Photos**:
   - Under FreshPlate's enterprise commercial agreement with Google Cloud, user prompts, receipt images, and refrigerator photos **are NOT used by Google to train, fine-tune, or improve Google Gemini or foundation AI models**.
   - Your private grocery items and domestic refrigerator photos remain strictly confidential.

3. **Restricted Scope**:
   - Google Cloud processes image data solely on behalf of FreshPlate to extract grocery items and generate tailored recipes. Google is contractually prohibited from retaining or using user data for advertising or unauthorized commercial purposes.

---

## 3. Data Storage, Retention, and Security

- **Encryption in Transit:** All network communication between the mobile app, backend servers, and Google Cloud APIs is strictly encrypted using Transport Layer Security (TLS 1.3 / HTTPS).
- **Encryption at Rest:** Extracted inventory items, expiration records, and user preferences are stored in encrypted Google Firestore databases utilizing AES-256 encryption.
- **Zero Image Retention:** Raw photos captured via the camera or selected from the device gallery are not retained in FreshPlate databases once visual analysis completes.

---

## 4. In-App Account Deletion & Data Erasure

In strict compliance with **Apple App Store Review Guideline 5.1.1(v)** and **Google Play Store Account Deletion Policy**:

### How to Delete Your Account and Data:
1. **In-App Direct Erasure:**
   - Open FreshPlate.
   - Tap **Settings (⚙️) → Danger Zone → Delete Account & All Data**.
   - Confirm deletion. All user credentials, saved pantry items, scan history, and custom recipes are permanently and irreversibly purged from our servers immediately.
2. **Web Deletion Portal:**
   - If you have uninstalled the app or prefer to request deletion via the web, visit our publicly accessible deletion portal:
   - **URL:** [https://freshplate.app/delete-account](https://freshplate.app/delete-account)
   - Enter your registered email address to initiate automated erasure within 24 hours.

---

## 5. Device Permissions & Purpose Strings

FreshPlate requests the following native device permissions, accompanied by explicit user-facing purpose explanations:

| Permission Name | Platform | Purpose String |
| :--- | :--- | :--- |
| `NSCameraUsageDescription` | iOS | "FreshPlate requires access to your camera to scan grocery receipts and refrigerator shelves for automated pantry tracking and food waste reduction." |
| `NSPhotoLibraryUsageDescription` | iOS | "FreshPlate needs access to your photo library to import existing photos of grocery receipts and pantry items." |
| `NSPhotoLibraryAddUsageDescription` | iOS | "FreshPlate may save processed grocery receipts or inventory scans to your photo library." |
| `android.permission.CAMERA` | Android | Required to capture camera photos of grocery bills and pantry shelves. |
| `android.permission.READ_MEDIA_IMAGES` | Android (API 33+) | Granular photo permission to select receipt images from device gallery. |

---

## 6. Children's Privacy

FreshPlate is not directed at children under the age of 13 (or under 16 in the European Union). We do not knowingly collect personal data from children.

---

## 7. Contact Us

For questions regarding this Privacy Policy, data privacy audits, or GDPR/CCPA data export requests, please contact our Data Protection Officer:

- **Entity:** FreshPlate Mobile Engineering & Privacy Team
- **Email:** [privacy@freshplate.app](mailto:privacy@freshplate.app)
- **Website:** [https://freshplate.app](https://freshplate.app)
- **Account Deletion Portal:** [https://freshplate.app/delete-account](https://freshplate.app/delete-account)
