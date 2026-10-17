import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { NetworkErrorInfo, NetworkErrorCode } from '../types';

interface NetworkErrorBannerProps {
  error: NetworkErrorInfo | null;
  onRetry?: () => void;
  onRetake?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
}

interface ErrorTheme {
  icon: string;
  badge: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
}

const ERROR_THEMES: Record<NetworkErrorCode, ErrorTheme> = {
  OFFLINE: {
    icon: '📶',
    badge: 'Offline Mode',
    bgColor: '#eff6ff',
    borderColor: '#93c5fd',
    textColor: '#1e3a8a',
    accentColor: '#2563eb'
  },
  TIMEOUT: {
    icon: '⏱️',
    badge: 'Network Timeout',
    bgColor: '#fff7ed',
    borderColor: '#fdba74',
    textColor: '#7c2d12',
    accentColor: '#ea580c'
  },
  BLURRY_IMAGE: {
    icon: '📸',
    badge: 'Image Quality Alert',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    textColor: '#78350f',
    accentColor: '#d97706'
  },
  RATE_LIMITED: {
    icon: '⏳',
    badge: 'Quota Limit',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    textColor: '#581c87',
    accentColor: '#9333ea'
  },
  SERVER_ERROR: {
    icon: '🖥️',
    badge: 'Server Unreachable',
    bgColor: '#fff1f2',
    borderColor: '#fda4af',
    textColor: '#881337',
    accentColor: '#e11d48'
  },
  PAYLOAD_TOO_LARGE: {
    icon: '📁',
    badge: 'Size Limit Exceeded',
    bgColor: '#fefce8',
    borderColor: '#fde047',
    textColor: '#713f12',
    accentColor: '#ca8a04'
  },
  UNKNOWN: {
    icon: '⚠️',
    badge: 'Connection Notice',
    bgColor: '#f8fafc',
    borderColor: '#cbd5e1',
    textColor: '#334155',
    accentColor: '#64748b'
  }
};

export function NetworkErrorBanner({
  error,
  onRetry,
  onRetake,
  onDismiss,
  isRetrying = false
}: NetworkErrorBannerProps) {
  if (!error) return null;

  const theme = ERROR_THEMES[error.code] || ERROR_THEMES.UNKNOWN;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
      {/* Top row: Icon, Badge, and Close Button */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <Text style={styles.icon}>{theme.icon}</Text>
          <View style={[styles.badge, { backgroundColor: theme.borderColor }]}>
            <Text style={[styles.badgeText, { color: theme.textColor }]}>{theme.badge}</Text>
          </View>
        </View>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.dismissText, { color: theme.textColor }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Title and Message */}
      <Text style={[styles.title, { color: theme.textColor }]}>{error.title}</Text>
      <Text style={[styles.message, { color: theme.textColor }]}>{error.message}</Text>

      {/* Specific Advice Callout */}
      {error.advice && (
        <View style={[styles.adviceBox, { borderColor: theme.borderColor }]}>
          <Text style={[styles.adviceText, { color: theme.textColor }]}>
            💡 <Text style={styles.bold}>Tip:</Text> {error.advice}
          </Text>
        </View>
      )}

      {/* Action Buttons: Retry and Retake */}
      <View style={styles.actionRow}>
        {error.isRetryable && onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.accentColor }]}
            onPress={onRetry}
            disabled={isRetrying}
            activeOpacity={0.8}
          >
            {isRetrying ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.retryButtonText}>Retrying Analysis...</Text>
              </View>
            ) : (
              <Text style={styles.retryButtonText}>🔄 Retry Analysis</Text>
            )}
          </TouchableOpacity>
        )}

        {onRetake && (
          <TouchableOpacity
            style={[styles.retakeButton, { borderColor: theme.borderColor }]}
            onPress={onRetake}
            disabled={isRetrying}
            activeOpacity={0.7}
          >
            <Text style={[styles.retakeButtonText, { color: theme.textColor }]}>📷 Retake Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    fontSize: 20,
    marginRight: 8
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.7,
    paddingHorizontal: 4
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
    marginBottom: 8
  },
  adviceBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12
  },
  adviceText: {
    fontSize: 13,
    lineHeight: 18
  },
  bold: {
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4
  },
  retryButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  retakeButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600'
  }
});
