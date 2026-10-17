import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator
} from 'react-native';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface AccountPrivacySettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onClearPantryData: () => void;
  onDeleteAccount: () => Promise<void> | void;
}

export function AccountPrivacySettingsModal({
  visible,
  onClose,
  onClearPantryData,
  onDeleteAccount
}: AccountPrivacySettingsModalProps) {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear Pantry & Scan Cache
  const handleClearDataPress = () => {
    Alert.alert(
      'Clear Local Pantry & Scan Data',
      'This will remove all current items from your pantry review list, scan history, and cached recipes on this device. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            onClearPantryData();
            Alert.alert('Data Cleared', 'Your active pantry and scan cache have been reset.');
          }
        }
      ]
    );
  };

  // Delete Account & All Data (Apple Guideline 5.1.1(v) & Google Play Store Policy)
  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account & Erase All Data',
      'This action is irreversible. All your pantry items, scan history, saved recipes, and account credentials will be permanently erased from our servers in compliance with Apple and Google Play data privacy regulations.\n\nDo you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDeleteAccount();
              setIsDeleting(false);
              onClose();
              Alert.alert(
                'Account Deleted',
                'Your account and all associated data have been permanently deleted.'
              );
            } catch (err: any) {
              setIsDeleting(false);
              Alert.alert('Deletion Error', err.message || 'Failed to complete deletion request.');
            }
          }
        }
      ]
    );
  };

  const handleOpenWebDeletionPortal = () => {
    Linking.openURL('https://freshplate.app/delete-account').catch((err) =>
      console.error('Failed to open deletion URL', err)
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Account & Privacy</Text>
            <Text style={styles.headerSubtitle}>Manage your data and privacy controls</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
          {/* Data Protection Overview Card */}
          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>🛡️ Your Data & Privacy Rights</Text>
            <Text style={styles.complianceText}>
              In accordance with Apple App Store Review Guideline 5.1.1 and Google Play Store User Data Policies, FreshPlate gives you complete control over your personal data, images, and stored pantry records.
            </Text>
          </View>

          {/* Privacy & Policy Options */}
          <Text style={styles.sectionTitle}>Privacy Disclosures</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setShowPrivacyPolicy(true)}
            >
              <View style={styles.menuIconWrap}>
                <Text style={styles.menuIcon}>📜</Text>
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Privacy Policy & AI Disclosures</Text>
                <Text style={styles.menuSubtitle}>
                  Learn how receipts & photos are processed by Google Gemini Vision
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Data Management Options */}
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.card}>
            {/* Clear Local Cache */}
            <TouchableOpacity style={styles.menuRow} onPress={handleClearDataPress}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#fef3c7' }]}>
                <Text style={styles.menuIcon}>🧹</Text>
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Clear Local Pantry & Scan Cache</Text>
                <Text style={styles.menuSubtitle}>
                  Resets current inventory and cached recipe suggestions
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Web Deletion Portal Link */}
            <TouchableOpacity style={styles.menuRow} onPress={handleOpenWebDeletionPortal}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#f1f5f9' }]}>
                <Text style={styles.menuIcon}>🌐</Text>
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Web Deletion Portal</Text>
                <Text style={styles.menuSubtitle}>
                  Request account erasure via https://freshplate.app/delete-account
                </Text>
              </View>
              <Text style={styles.menuChevron}>↗</Text>
            </TouchableOpacity>
          </View>

          {/* Danger Zone: Delete Account & All Data */}
          <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>Danger Zone</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <View style={styles.dangerHeader}>
              <Text style={styles.dangerTitle}>Permanent Account Deletion</Text>
              <Text style={styles.dangerDescription}>
                Permanently erases your user account, stored grocery receipts, detected ingredients, and customized AI recipes from FreshPlate servers.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.deleteAccountButton, isDeleting && styles.buttonDisabled]}
              onPress={handleDeleteAccountPress}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.deleteAccountButtonText}>
                  Delete Account & All Data
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNotice}>
            FreshPlate complies with Apple Human Interface Guidelines and Google Play Data Safety policies. Photos submitted to Google Gemini Vision are ephemeral and never retained.
          </Text>
        </ScrollView>

        {/* In-app Privacy Policy Modal */}
        <PrivacyPolicyModal
          visible={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
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
  container: {
    padding: 20,
    paddingBottom: 40
  },
  complianceCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20
  },
  complianceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 4
  },
  complianceText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuIcon: {
    fontSize: 16
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
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  menuChevron: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9'
  },
  dangerCard: {
    borderColor: '#fecaca',
    padding: 18
  },
  dangerHeader: {
    marginBottom: 14
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 4
  },
  dangerDescription: {
    fontSize: 12,
    color: '#b91c1c',
    lineHeight: 18
  },
  deleteAccountButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  footerNotice: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8
  }
});
