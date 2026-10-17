import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking
} from 'react-native';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  const handleOpenWebPolicy = () => {
    Linking.openURL('https://freshplate.app/privacy').catch((err) =>
      console.error('Failed to open web URL', err)
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Modal Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Privacy Policy & AI Disclosures</Text>
            <Text style={styles.headerSubtitle}>Last Updated: October 2026</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Legal & AI Disclosure Text */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightTitle}>🔒 Privacy & AI Summary</Text>
            <Text style={styles.highlightText}>
              • FreshPlate accesses your camera and photos strictly to scan grocery receipts and refrigerator items.{"\n"}
              • Photos are processed ephemerally in-memory and are never stored on public servers.{"\n"}
              • FreshPlate uses Google Cloud Gemini Vision API. Your images are never used to train public AI models.{"\n"}
              • You retain 100% control to delete your inventory, scan history, and account data at any time.
            </Text>
          </View>

          <Text style={styles.sectionHeading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            FreshPlate ("we", "our", or "the App") collects and processes information necessary to provide automated pantry inventory tracking and food waste reduction recipes:
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Camera & Photo Library Images:</Text> Images of supermarket receipts, refrigerator shelves, and pantry items explicitly captured or selected by you.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Extracted Inventory Data:</Text> Ingredient names, quantities, purchase dates, and estimated expiration dates extracted from images.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Account Credentials:</Text> Email address, authentication tokens, and profile identifiers if you create an account.
          </Text>

          <Text style={styles.sectionHeading}>2. Third-Party AI Subprocessors (Google Cloud & Gemini)</Text>
          <Text style={styles.paragraph}>
            To perform optical character recognition (OCR) and object recognition on receipts and pantry items, FreshPlate utilizes third-party artificial intelligence services provided by Google Cloud (Vertex AI and Google Gemini API).
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Ephemeral In-Memory Processing:</Text> Captured photos are transmitted over encrypted TLS/HTTPS connections to our secure backend and analyzed in-memory. Image buffers are immediately discarded following analysis.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>No AI Model Training on User Images:</Text> Under our Google Cloud API Enterprise terms, user photos, receipts, and prompts sent to the Gemini Vision API are <Text style={styles.bold}>not</Text> used to train or improve Google's foundation machine learning models.
          </Text>

          <Text style={styles.sectionHeading}>3. Storage, Retention & Security</Text>
          <Text style={styles.paragraph}>
            • We do not store raw receipt or refrigerator image files on disk or long-term cloud buckets.{"\n"}
            • Structured metadata (ingredient names, status, expiry) is stored securely in encrypted Google Firestore databases.{"\n"}
            • Data in transit is strictly encrypted using TLS 1.3 / HTTPS.
          </Text>

          <Text style={styles.sectionHeading}>4. In-App Data Deletion & Account Erasure</Text>
          <Text style={styles.paragraph}>
            In compliance with Apple App Store Review Guideline 5.1.1(v) and Google Play Store User Data Policies:
          </Text>
          <Text style={styles.bulletPoint}>
            • You can delete your active pantry items, scan history, or entire user account directly inside the app under <Text style={styles.bold}>Settings → Delete Account & Clear Data</Text>.
          </Text>
          <Text style={styles.bulletPoint}>
            • Alternatively, you can submit an account and data erasure request via our web portal at <Text style={styles.bold}>https://freshplate.app/delete-account</Text>.
          </Text>
          <Text style={styles.paragraph}>
            Upon initiating account deletion, all associated pantry records, custom recipes, and user profile data will be permanently wiped within 24 hours.
          </Text>

          <Text style={styles.sectionHeading}>5. App Store & Google Play Permissions</Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Camera (NSCameraUsageDescription / CAMERA):</Text> Used solely to capture physical receipts and refrigerator shelves within the active app session.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Photo Library (NSPhotoLibraryUsageDescription / READ_MEDIA_IMAGES):</Text> Used solely to allow you to choose existing receipt or pantry photos from your gallery.
          </Text>

          <Text style={styles.sectionHeading}>6. Contact Data Protection Officer</Text>
          <Text style={styles.paragraph}>
            If you have questions regarding this Privacy Policy, your rights under GDPR/CCPA, or wish to request data export:
          </Text>
          <Text style={styles.paragraph}>
            FreshPlate Privacy Team{"\n"}
            Email: <Text style={styles.linkText}>privacy@freshplate.app</Text>{"\n"}
            Website: <Text style={styles.linkText}>https://freshplate.app</Text>
          </Text>

          <TouchableOpacity style={styles.webPolicyButton} onPress={handleOpenWebPolicy}>
            <Text style={styles.webPolicyButtonText}>Open Web Privacy Policy ↗</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  closeButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669'
  },
  scrollView: {
    flex: 1
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40
  },
  highlightCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 6
  },
  highlightText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 20
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 8
  },
  paragraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 8
  },
  bulletPoint: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 6
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b'
  },
  linkText: {
    color: '#059669',
    fontWeight: '600'
  },
  webPolicyButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24
  },
  webPolicyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155'
  }
});
