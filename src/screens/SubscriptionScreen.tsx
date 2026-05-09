import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, Image } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { generatePaymentQR, checkPaymentStatus } from '../services/bakongService';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import KHQRCard from '../components/KHQRCard';
import { getAccessStatus } from '../utils/accessStatus';
import { saveImageToGallery } from '../utils/saveImageToGallery';

export default function SubscriptionScreen() {
  const { settings, updateSettings, t } = useClients();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);
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
  };

  const handleSaveQRImage = async () => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });

      const success = await saveImageToGallery(uri);
      if (success) {
        Alert.alert(t('success'), t('qrSaved') || "QR Image saved to your photos!");
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      Alert.alert("Error", `Failed to save: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRefreshQR = async () => {
    if (selectedPlan) {
      const data = generatePaymentQR(selectedPlan.amount, 'USD');
      setQrData(data);
      setTimeLeft(300);
      setPaymentSuccess(false);
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
    return getAccessStatus(settings);
  };

  const statusInfo = getRemainingDaysInfo();
  const isActive = statusInfo.active;

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
            {t('subscriptionInfo')}
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
                      {t('sessionExpires')}{formatTime(timeLeft)}
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
                    <TouchableOpacity style={styles.saveImageBtn} onPress={handleSaveQRImage}>
                      <Ionicons name="download" size={20} color={COLORS.primary} />
                      <Text style={styles.saveImageBtnText}>{t('saveToGallery') || 'Save Image'}</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.autoVerifyStatus}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.autoVerifyText}>
                      {timeLeft > 0 ? t('paymentPending') : t('sessionExpired')}
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
                <Text style={styles.successMsg}>{t('subscriptionUpdated')}</Text>
                <TouchableOpacity 
                  style={styles.doneBtn} 
                  onPress={() => setShowPayment(false)}
                >
                  <Text style={styles.doneBtnText}>{t('done')}</Text>
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

  saveImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, backgroundColor: COLORS.surfaceLight, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 20 },
  saveImageBtnText: { color: COLORS.primary, fontWeight: 'bold' },

  autoVerifyStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: COLORS.surfaceLight, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  autoVerifyText: { color: COLORS.textDim, fontSize: 14, fontWeight: '500' },

  scanText: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 24, textAlign: 'center' },

  // Success Screen
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  successIconContainer: { marginBottom: 24 },
  successTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  successMsg: { color: COLORS.textDim, fontSize: 16, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  doneBtn: { backgroundColor: COLORS.primary, width: '100%', padding: 18, borderRadius: 16, alignItems: 'center' },
  doneBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
});
