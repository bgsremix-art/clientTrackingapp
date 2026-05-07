import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../context/ClientContext';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import { reload } from 'firebase/auth';
import SubscriptionScreen from '../screens/SubscriptionScreen';

interface AccessGuardProps {
  children: React.ReactNode;
}

export const AccessGuard: React.FC<AccessGuardProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { settings, t } = useClients();
  const [checking, setChecking] = useState(false);

  const checkVerification = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    try {
      await reload(auth.currentUser);
    } catch (error) {
      console.log("Error reloading user:", error);
    } finally {
      setChecking(false);
    }
  };

  if (!user) return <>{children}</>;

  // 1. Email Verification Check (Highest Priority)
  if (!user.emailVerified) {
    return (
      <View style={styles.blockContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{t('verifyEmailTitle')}</Text>
        <Text style={styles.message}>
          {t('verifyEmailMessage')}
        </Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={checkVerification}
          disabled={checking}
        >
          {checking ? <ActivityIndicator color="#000" /> : <Text style={styles.actionButtonText}>{t('iHaveVerified')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Subscription & Trial Check
  if (!settings.trialStartedAt) {
    return (
      <View style={styles.blockContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const trialStart = new Date(settings.trialStartedAt).getTime();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  const trialExpiry = trialStart + threeDaysInMs;
  const now = Date.now();

  const subscriptionExpiry = settings.subscriptionExpiry ? new Date(settings.subscriptionExpiry).getTime() : 0;

  const isTrialActive = now <= trialExpiry;
  const isSubscriptionActive = now <= subscriptionExpiry;

  // If both trial and subscription are expired, show subscription screen
  if (!isTrialActive && !isSubscriptionActive) {
    return (
      <View style={{ flex: 1 }}>
        <SubscriptionScreen />
        {/* Optional: Add a logout button overlay if they get stuck */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 100 }}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  blockContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    color: COLORS.textDim,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 12,
  },
  logoutText: {
    color: COLORS.textDim,
    fontSize: 16,
    textDecorationLine: 'underline',
  }
});
