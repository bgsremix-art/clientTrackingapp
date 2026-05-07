import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, Image, Linking } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { generatePaymentQR, checkPaymentStatus, generateDeeplink } from '../services/bakongService';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import KHQRCard from '../components/KHQRCard';

export default function SubscriptionScreen() {
  const { settings, updateSettings, t } = useClients();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const viewShotRef = React.useRef<any>(null);

  // Auto-verify polling and timer
  React.useEffect(() => {
    let interval: any;
    let timer: any;

    if (showPayment && qrData && !paymentSuccess) {
      setTimeLeft(300); // Reset timer to 5mn

      // Timer countdown
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Polling
      interval = setInterval(async () => {
        try {
          const status = await checkPaymentStatus(qrData.md5);
          if (status && (status.responseCode === 0 || status.data)) {
            completeSubscription(selectedPlan.months);
            clearInterval(interval);
            clearInterval(timer);
          }
        } catch (e) {
          console.log("Polling error:", e);
        }
      }, 5000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [showPayment, qrData, paymentSuccess]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const plans = [
    { id: '1month', title: t('oneMonth'), price: '$5', amount: 5, months: 1 },
    { id: '3month', title: t('threeMonths'), price: '$13', amount: 13, months: 3 },
    { id: '6month', title: t('sixMonths'), price: '$24', amount: 24, months: 6 },
    { id: '1year', title: t('oneYear'), price: '$45', amount: 45, months: 12 },
  ];

  const handlePlanSelect = async (plan: any) => {
    const data = generatePaymentQR(plan.amount, 'USD');
    setSelectedPlan(plan);
    setQrData(data);
    setShowPayment(true);
    setPaymentSuccess(false);
    
    // Generate deeplink
    const link = await generateDeeplink(data.qrString);
    setDeeplink(link);
  };

  const handleSaveQRImage = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need permission to save the image to your gallery.");
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('success'), "QR Image saved to your gallery!");
    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert("Error", "Failed to save image.");
    }
  };

  const handleRefreshQR = async () => {
    if (selectedPlan) {
      const data = generatePaymentQR(selectedPlan.amount, 'USD');
      setQrData(data);
      setDeeplink(null);
      setTimeLeft(300);
      setPaymentSuccess(false);
      
      const link = await generateDeeplink(data.qrString);
      setDeeplink(link);
    }
  };

  const completeSubscription = (months: number) => {
    const currentExpiry = settings.subscriptionExpiry ? new Date(settings.subscriptionExpiry) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    updateSettings({
      ...settings,
      subscriptionExpiry: newExpiry.toISOString()
    });

    setPaymentSuccess(true);
  };

  const getRemainingDaysInfo = () => {
    const now = new Date().getTime();

    // 1. Check paid subscription first
    if (settings.subscriptionExpiry) {
      const expiry = new Date(settings.subscriptionExpiry).getTime();
      if (expiry > now) {
        const diff = expiry - now;
        const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        return { days, type: 'subscription' as const };
      }
    }

    // 2. Check free trial
    if (settings.trialStartedAt) {
      // TESTING: Force expired
      const trialStart = new Date(settings.trialStartedAt).getTime() - (4 * 24 * 60 * 60 * 1000);
      const trialExpiry = trialStart + (3 * 24 * 60 * 60 * 1000);
      if (trialExpiry > now) {
        const diff = trialExpiry - now;
        const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        return { days, type: 'trial' as const };
      }
    }

    return { days: 0, type: 'none' as const };
  };

  const statusInfo = getRemainingDaysInfo();
  const isActive = statusInfo.type !== 'none';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>{t('subscription')}</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={isActive ? "checkmark-circle" : "alert-circle"}
              size={32}
              color={isActive ? COLORS.primary : COLORS.textDim}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {statusInfo.type === 'subscription' ? t('active') :
                  statusInfo.type === 'trial' ? (t('freeTrial') || 'Free Trial') :
                    t('expired')}
              </Text>
              {isActive && (
                <Text style={styles.statusSub}>
                  {t('remainingDays')}{statusInfo.days} {t('daysRemaining').toLowerCase()}
                </Text>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('selectPlan')}</Text>

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              onPress={() => handlePlanSelect(plan)}
            >
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>
              <View style={styles.subscribeBtn}>
                <Text style={styles.subscribeBtnText}>{t('subscribeNow')}</Text>
                <Ionicons name="chevron-forward" size={18} color="#000" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textDim} />
          <Text style={styles.infoText}>
            Subscription unlocks all professional features and cloud sync. Payments are processed securely via Bakong KHQR.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showPayment} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!paymentSuccess ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('paymentTitle')}</Text>
                  <TouchableOpacity onPress={() => setShowPayment(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}>
                  {/* Timer Section */}
                  <View style={styles.timerContainer}>
                    <Ionicons name="time-outline" size={16} color={timeLeft < 60 ? "#E31E24" : COLORS.textDim} />
                    <Text style={[styles.timerText, timeLeft < 60 && { color: "#E31E24" }]}>
                      Session expires in: {formatTime(timeLeft)}
                    </Text>
                  </View>

                  {/* SVG based KHQR Card */}
                  <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                    {qrData && qrData.qrString ? (
                      <KHQRCard
                        qrString={qrData.qrString}
                        merchantName="Client Tracking App"
                        amount={selectedPlan?.amount || 0}
                        currency="USD"
                      />
                    ) : (
                      <View style={[styles.khqrCard, { justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator size="large" color="#fff" />
                      </View>
                    )}
                  </ViewShot>

                  {timeLeft > 0 && (
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity style={styles.saveImageBtn} onPress={handleSaveQRImage}>
                        <Ionicons name="download" size={20} color={COLORS.primary} />
                        <Text style={styles.saveImageBtnText}>{t('saveToGallery') || 'Save Image'}</Text>
                      </TouchableOpacity>

                      {deeplink && (
                        <TouchableOpacity 
                          style={styles.openBankBtn} 
                          onPress={() => Linking.openURL(deeplink)}
                        >
                          <Ionicons name="apps-outline" size={20} color="#000" />
                          <Text style={styles.openBankBtnText}>{t('payInBankApp') || 'Pay in Bank App'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <View style={styles.autoVerifyStatus}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.autoVerifyText}>
                      {timeLeft > 0 ? "Waiting for payment..." : "Session Expired"}
                    </Text>
                  </View>

                  <Text style={styles.scanText}>{t('scanToPay')}</Text>
                </ScrollView>
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={100} color={COLORS.primary} />
                </View>
                <Text style={styles.successTitle}>{t('paymentSuccess')}</Text>
                <Text style={styles.successMsg}>
                  Your subscription has been updated successfully. You now have full access to all professional features.
                </Text>

                <View style={styles.successDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <Text style={styles.detailValue}>{selectedPlan?.title}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>{selectedPlan?.price}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={() => setShowPayment(false)}
                >
                  <Text style={styles.continueBtnText}>Start Using Features</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  headerTitle: { color: COLORS.text, fontSize: 36, fontWeight: 'bold', marginBottom: 24 },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusTitle: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
  statusSub: { color: COLORS.primary, fontSize: 16, fontWeight: '600', marginTop: 4 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  plansContainer: { gap: 16 },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planInfo: { flex: 1 },
  planTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  planPrice: { color: COLORS.primary, fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  subscribeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subscribeBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
  },
  infoText: { color: COLORS.textDim, fontSize: 13, flex: 1 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },

  // Timer
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  timerText: { color: COLORS.textDim, fontSize: 14, fontWeight: '600' },

  // Official KHQR Card (Fallback style if SVG fails)
  khqrCard: {
    width: 300,
    height: 422,
    backgroundColor: '#E21A1A',
    borderRadius: 24,
    marginBottom: 12,
  },

  saveImageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceLight, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  saveImageBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  
  actionButtonsRow: { flexDirection: 'row', gap: 12, width: '100%', paddingHorizontal: 10, marginTop: 20, marginBottom: 24 },
  openBankBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, padding: 12, borderRadius: 12, justifyContent: 'center' },
  openBankBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },

  autoVerifyStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: COLORS.surfaceLight, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  autoVerifyText: { color: COLORS.textDim, fontSize: 14, fontWeight: '500' },

  scanText: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 24, textAlign: 'center' },

  // Success Screen
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  successIconContainer: { marginBottom: 24 },
  successTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  successMsg: { color: COLORS.textDim, fontSize: 16, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  successDetails: { width: '100%', backgroundColor: COLORS.surfaceLight, borderRadius: 16, padding: 20, marginBottom: 40 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { color: COLORS.textDim, fontSize: 14 },
  detailValue: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  continueBtn: { backgroundColor: COLORS.primary, width: '100%', padding: 18, borderRadius: 16, alignItems: 'center' },
  continueBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
});
