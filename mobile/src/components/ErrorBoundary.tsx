import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform
} from 'react-native';
import { clearCachedPantry } from '../services/storage';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Mobile UI/UX Error Boundary to prevent white screen of death crashes,
 * providing graceful user recovery, error diagnostics, and offline cache reset.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    if (__DEV__) {
      console.error('[FreshPlate ErrorBoundary] Caught unhandled React UI error:', error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleClearCacheAndRestart = async (): Promise<void> => {
    try {
      await clearCachedPantry();
    } catch (e) {
      console.warn('[FreshPlate ErrorBoundary] Failed clearing cache:', e);
    }
    this.handleRetry();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>🛡️</Text>
              </View>

              <Text style={styles.title}>Something went wrong</Text>
              <Text style={styles.subtitle}>
                FreshPlate encountered an unexpected visual error. Don't worry, your offline inventory is preserved.
              </Text>

              {this.state.error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorLabel}>Technical Details:</Text>
                  <Text style={styles.errorMessage}>{this.state.error.message}</Text>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={this.handleRetry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>🔄 Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={this.handleClearCacheAndRestart}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>🧹 Clear Cache & Recover</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.footerNote}>
                If this issue persists, please check your network connection or restart the application.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  iconText: {
    fontSize: 32
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444'
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4
  },
  errorMessage: {
    fontSize: 13,
    color: '#991b1b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  buttonContainer: {
    width: '100%',
    gap: 12
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '500'
  },
  footerNote: {
    marginTop: 20,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center'
  }
});
