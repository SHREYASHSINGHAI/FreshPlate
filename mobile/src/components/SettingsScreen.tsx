import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface SettingsScreenProps {
  onBack: () => void;
  onClearPantryData: () => void;
  onDeleteAccount: () => Promise<void> | void;
  cachedItemCount?: number;
  lastSyncTime?: string | null;
}

export function SettingsScreen({
  onBack,
  onClearPantryData,
  onDeleteAccount,
  cachedItemCount = 0,
  lastSyncTime
}: SettingsScreenProps) {
  const [showInAppPrivacyModal, setShowInAppPrivacyModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Direct link to hosted Privacy Policy (disclosing Google Gemini AI processing)
  const handleOpenHostedPrivacyPolicy = () => {
    Linking.openURL('https://freshplate.app/privacy').catch((err) => {
      console.error('[Settings] Failed to open hosted privacy policy URL:', err);
      Alert.alert(
        'Unable to Open Browser',
        'Please visit https://freshplate.app/privacy to review our full Privacy Policy.'
      );
    });
  };

  // Direct link to web-based account deletion portal
  const handleOpenWebDeletionPortal = () => {
    Linking.openURL('https://freshplate.app/delete-account').catch((err) => {
      console.error('[Settings] Failed to open account deletion portal:', err);
      Alert.alert(
        'Unable to Open Browser',
        'Please visit https://freshplate.app/delete-account to request account deletion.'
      );
    });
  };

  // Clear local device pantry cache & scan history
  const handleClearLocalData = () => {
    Alert.alert(
      'Clear Local Pantry & Scan Data',
      'This will clear all items from your current pantry inventory, scan history, and offline recipe cache on this device. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            onClearPantryData();
            Alert.alert('Data Cleared', 'Your local pantry cache has been reset.');
          }
        }
      ]
    );
  };

  // Mandatory Apple Store Guideline 5.1.1(v) & Google Play Store in-app deletion
  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account & Clear Data',
      'This action is irreversible. In accordance with Apple App Store Review Guideline 5.1.1(v) and Google Play Store policies, all your user credentials, stored pantry items, scan history, and custom recipes will be permanently erased from our servers.\n\nDo you wish to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDeleteAccount();
              setIsDeleting(false);
              Alert.alert(
                'Account Deleted',
                'Your account and all associated personal data have been permanently erased.'
              );
              onBack();
            } catch (err: any) {
              setIsDeleting(false);
              Alert.alert('Deletion Error', err.message || 'Failed to complete deletion request.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Scanner</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Settings & Account</Text>
          <Text style={styles.headerSubtitle}>Compliance, privacy & data controls</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        {/* Profile & Device Identity Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>FreshPlate User</Text>
              <Text style={styles.profileStatus}>Local Account • Dual iOS & Android v1.0.0</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{cachedItemCount}</Text>
              <Text style={styles.statLabel}>Items Stored Offline</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {lastSyncTime
                  ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Active'}
              </Text>
              <Text style={styles.statLabel}>Last Cache Sync</Text>
            </View>
          </View>
        </View>

        {/* AI Transparency & Google Gemini Disclosure Section */}
        <Text style={styles.sectionHeading}>AI Data Processing & Transparency</Text>
        <View style={styles.card}>
          <View style={styles.aiBadgeRow}>
            <Text style={styles.aiIcon}>✨</Text>
            <Text style={styles.aiHeading}>Google Gemini AI Vision Disclosures</Text>
          </View>
          <Text style={styles.aiDescription}>
            FreshPlate uses Google Cloud's Gemini Vision API to analyze photos of supermarket bills and refrigerator shelves to identify food items and estimate shelf lives.
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Ephemeral Processing:</Text> Photos are analyzed in-memory and are never permanently stored on our servers.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Zero Model Training:</Text> Your receipt photos and domestic fridge images are never used to train public AI models.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Encrypted In-Transit:</Text> All transmissions utilize TLS 1.3 / HTTPS encryption.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Hosted Privacy Policy Direct Link */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleOpenHostedPrivacyPolicy}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Text style={styles.menuIcon}>🌐</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Hosted Privacy Policy</Text>
              <Text style={styles.menuSubtitle}>
                https://freshplate.app/privacy (Full AI & data disclosures)
              </Text>
            </View>
            <Text style={styles.menuChevron}>↗</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* In-App Privacy Modal */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowInAppPrivacyModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Text style={styles.menuIcon}>📜</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>In-App Privacy Disclosures</Text>
              <Text style={styles.menuSubtitle}>Read complete privacy agreement without leaving app</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Data & Storage Management */}
        <Text style={styles.sectionHeading}>Data Management</Text>
        <View style={styles.card}>
          {/* Clear Local Cache */}
          <TouchableOpacity style={styles.menuRow} onPress={handleClearLocalData} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.menuIcon}>🧹</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Clear Local Pantry & Scan Cache</Text>
              <Text style={styles.menuSubtitle}>
                Resets active inventory and cached recipe suggestions
              </Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Web Deletion Portal Link */}
          <TouchableOpacity style={styles.menuRow} onPress={handleOpenWebDeletionPortal} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#f1f5f9' }]}>
              <Text style={styles.menuIcon}>🔗</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Web Deletion Portal</Text>
              <Text style={styles.menuSubtitle}>
                Request deletion externally at freshplate.app/delete-account
              </Text>
            </View>
            <Text style={styles.menuChevron}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone: Mandatory Apple App Store Account Deletion */}
        <Text style={[styles.sectionHeading, { color: '#dc2626' }]}>
          Apple & Google Compliance (Danger Zone)
        </Text>
        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.dangerHeader}>
            <Text style={styles.dangerTitle}>⚠️ Permanent Account Deletion</Text>
            <Text style={styles.dangerDescription}>
              In compliance with <Text style={styles.boldText}>Apple App Store Review Guideline 5.1.1(v)</Text> and Google Play Store User Data Safety requirements:
            </Text>
            <Text style={styles.dangerNotice}>
              Selecting the button below will immediately and permanently erase your account credentials, cloud records, saved receipts, and device cache.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
            onPress={handleDeleteAccountPress}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            {isDeleting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.deleteButtonText}>Erasing Account & Data...</Text>
              </View>
            ) : (
              <Text style={styles.deleteButtonText}>🗑️ Delete Account & Clear Data</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerLegal}>
          FreshPlate is compliant with Apple App Store Review Guidelines (5.1.1, 5.1.1(v)) and Google Play Developer Policies. User data is never sold or used for targeted advertising.
        </Text>
      </ScrollView>

      {/* In-App Privacy Policy Reader */}
      <PrivacyPolicyModal
        visible={showInAppPrivacyModal}
        onClose={() => setShowInAppPrivacyModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backButton: {
    paddingVertical: 6,
    marginBottom: 6
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669'
  },
  headerTitleWrap: {
    marginTop: 2
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  scrollView: {
    flex: 1
  },
  container: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  avatarText: {
    fontSize: 24
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  profileStatus: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4
  },
  statBox: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669'
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600'
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0'
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  aiIcon: {
    fontSize: 20
  },
  aiHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  aiDescription: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 10
  },
  bulletList: {
    gap: 6,
    marginBottom: 4
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6
  },
  bulletDot: {
    fontSize: 14,
    color: '#059669',
    lineHeight: 18
  },
  bulletText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    flex: 1
  },
  boldText: {
    fontWeight: '700',
    color: '#1e293b'
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  menuIcon: {
    fontSize: 18
  },
  menuTextWrap: {
    flex: 1
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  menuChevron: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8
  },
  dangerCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5'
  },
  dangerHeader: {
    marginBottom: 16
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b91c1c',
    marginBottom: 6
  },
  dangerDescription: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
    marginBottom: 8
  },
  dangerNotice: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 17,
    fontStyle: 'italic'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  footerLegal: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 10
  }
});
