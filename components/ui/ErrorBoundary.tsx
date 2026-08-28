/**
 * components/ui/ErrorBoundary.tsx
 * Production-ready Arabic Error Boundary for mستر جيشو.
 * Prevents single-screen crashes from collapsing the entire app.
 */
import React, { Component, ReactNode } from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  /** Optional: override the fallback UI */
  fallback?: ReactNode;
  /** Called when an error is caught (e.g. for crash-reporting) */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Expo Router navigation ref passed to enable "Go Home" */
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for debugging only – never expose to users
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error.message);
      console.error('[ErrorBoundary] Component stack:', info.componentStack);
    }
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onNavigateHome?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <MaterialIcons name="error-outline" size={56} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={styles.title}>حدث خطأ غير متوقع</Text>

          {/* Description */}
          <Text style={styles.desc}>
            حدثت مشكلة أثناء تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={this.handleRetry}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="إعادة المحاولة"
            >
              <MaterialIcons name="refresh" size={18} color="#FFF" />
              <Text style={styles.retryTxt}>إعادة المحاولة</Text>
            </Pressable>

            {this.props.onNavigateHome && (
              <Pressable
                onPress={this.handleHome}
                style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel="العودة إلى الرئيسية"
              >
                <MaterialIcons name="home" size={18} color="#3B82F6" />
                <Text style={styles.homeTxt}>العودة إلى الرئيسية</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Cairo_700Bold',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
  },
  retryTxt: {
    fontSize: 15,
    fontFamily: 'Cairo_700Bold',
    color: '#FFF',
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#3B82F610',
    borderWidth: 1,
    borderColor: '#3B82F640',
  },
  homeTxt: {
    fontSize: 15,
    fontFamily: 'Cairo_600SemiBold',
    color: '#3B82F6',
  },
});

export default ErrorBoundary;
