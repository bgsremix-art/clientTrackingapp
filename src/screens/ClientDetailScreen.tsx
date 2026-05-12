import React, { useRef, useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Dimensions, Animated, PanResponder } from 'react-native';
import { State, GestureHandlerRootView, PinchGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { uploadImageToFirebase } from '../utils/firebaseStorage';
import { saveImageToGallery } from '../utils/saveImageToGallery';
import { calculateBMR, calculateBMI, getHealthyWeightRange, calculateEstimatedWeeks } from '../utils/bmrEngine';
import { getSafeFileName, saveClientProgressPdf, saveImageFile, shareClientProgressPdf, shareImageFile } from '../utils/pdfExport';

export default function ClientDetailScreen({ route, navigation }: any) {
   const { clientId } = route.params;
   const { clients, records, attendance, payments, addRecord, editRecord, deleteRecord, deleteClient, editClient, settings, t, addPayment, deletePayment } = useClients();
   const client = clients.find(c => c.id === clientId);

   const history = useMemo(() => 
      records.filter(r => r.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
   [records, clientId]);
   
   const groupedHistory = useMemo(() => {
      const groups: { [key: string]: any[] } = {};
      history.forEach(record => {
         const date = new Date(record.date);
         const key = date.toLocaleDateString(settings.language === 'km' ? 'km-KH' : 'en-GB', { month: 'long', year: 'numeric' });
         if (!groups[key]) groups[key] = [];
         groups[key].push(record);
      });
      return groups;
   }, [history, settings.language]);

   const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
   const hasInitializedRef = useRef(false);

   useEffect(() => {
      if (Object.keys(groupedHistory).length > 0 && !hasInitializedRef.current) {
         // Expand the most recent month by default ONLY ONCE
         const mostRecentMonth = Object.keys(groupedHistory)[0];
         setExpandedMonths([mostRecentMonth]);
         hasInitializedRef.current = true;
      }
   }, [groupedHistory]);

   const toggleMonth = (monthKey: string) => {
      setExpandedMonths(prev => 
         prev.includes(monthKey) ? prev.filter(m => m !== monthKey) : [...prev, monthKey]
      );
   };

   const latestWeight = history.length > 0 ? history[0] : null;

   const { width: SCREEN_WIDTH } = Dimensions.get('window');
   const compareWidth = SCREEN_WIDTH * 0.98 - 24;
   const frameWidth = compareWidth / 2;
   const frameHeight = (frameWidth * 4) / 3;

   // Animated Values for Before
   const scaleB = useRef(new Animated.Value(1)).current;
   const translateX_B = useRef(new Animated.Value(0)).current;
   const translateY_B = useRef(new Animated.Value(0)).current;
   let lastScaleB = 1;
   let lastTranslateX_B = 0;
   let lastTranslateY_B = 0;

   const onPinchEventB = Animated.event([{ nativeEvent: { scale: scaleB } }], { useNativeDriver: true });
   const onPinchStateChangeB = (event: any) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
         lastScaleB *= event.nativeEvent.scale;
         scaleB.setOffset(lastScaleB);
         scaleB.setValue(1);
      }
   };

   const onPanEventB = Animated.event([{ nativeEvent: { translationX: translateX_B, translationY: translateY_B } }], { useNativeDriver: true });
   const onPanStateChangeB = (event: any) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
         lastTranslateX_B += event.nativeEvent.translationX;
         lastTranslateY_B += event.nativeEvent.translationY;
         translateX_B.setOffset(lastTranslateX_B);
         translateX_B.setValue(0);
         translateY_B.setOffset(lastTranslateY_B);
         translateY_B.setValue(0);
      }
   };

   // Animated Values for After
   const scaleA = useRef(new Animated.Value(1)).current;
   const translateX_A = useRef(new Animated.Value(0)).current;
   const translateY_A = useRef(new Animated.Value(0)).current;
   let lastScaleA = 1;
   let lastTranslateX_A = 0;
   let lastTranslateY_A = 0;

   const onPinchEventA = Animated.event([{ nativeEvent: { scale: scaleA } }], { useNativeDriver: true });
   const onPinchStateChangeA = (event: any) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
         lastScaleA *= event.nativeEvent.scale;
         scaleA.setOffset(lastScaleA);
         scaleA.setValue(1);
      }
   };

   const onPanEventA = Animated.event([{ nativeEvent: { translationX: translateX_A, translationY: translateY_A } }], { useNativeDriver: true });
   const onPanStateChangeA = (event: any) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
         lastTranslateX_A += event.nativeEvent.translationX;
         lastTranslateY_A += event.nativeEvent.translationY;
         translateX_A.setOffset(lastTranslateX_A);
         translateX_A.setValue(0);
         translateY_A.setOffset(lastTranslateY_A);
         translateY_A.setValue(0);
      }
   };

   const resetZoomB = () => {
      lastScaleB = 1; lastTranslateX_B = 0; lastTranslateY_B = 0;
      scaleB.setOffset(1); scaleB.setValue(1);
      translateX_B.setOffset(0); translateX_B.setValue(0);
      translateY_B.setOffset(0); translateY_B.setValue(0);
   };

   const resetZoomA = () => {
      lastScaleA = 1; lastTranslateX_A = 0; lastTranslateY_A = 0;
      scaleA.setOffset(1); scaleA.setValue(1);
      translateX_A.setOffset(0); translateX_A.setValue(0);
      translateY_A.setOffset(0); translateY_A.setValue(0);
   };

   // Refs for simultaneous gesture handling
   const panRefB = useRef(null);
   const pinchRefB = useRef(null);
   const panRefA = useRef(null);
   const pinchRefA = useRef(null);

   const [modalVisible, setModalVisible] = useState(false);
   const [configModalVisible, setConfigModalVisible] = useState(false);
   const [newWeight, setNewWeight] = useState('');
   const [recordPhotoUris, setRecordPhotoUris] = useState<string[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const [isSharingPdf, setIsSharingPdf] = useState(false);
   const [isCapturingReport, setIsCapturingReport] = useState(false);
   const [reportOptionsVisible, setReportOptionsVisible] = useState(false);
   const [activeImage, setActiveImage] = useState<string | null>(null);
   const [compareModalVisible, setCompareModalVisible] = useState(false);
   const [beforeRecord, setBeforeRecord] = useState<any | null>(null);
   const [afterRecord, setAfterRecord] = useState<any | null>(null);
   const [beforePhotoIdx, setBeforePhotoIdx] = useState(0);
   const [afterPhotoIdx, setAfterPhotoIdx] = useState(0);
   const [isSelectingForCompare, setIsSelectingForCompare] = useState(false);
   const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
   
   const [paymentModalVisible, setPaymentModalVisible] = useState(false);
   const [paymentAmount, setPaymentAmount] = useState('');
   const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
   const [paymentCurrency, setPaymentCurrency] = useState('USD');

   const progressReportRef = useRef<View>(null);
   const comparisonRef = useRef<View>(null);

   const [localModifier, setLocalModifier] = useState(client?.customCalorieModifier?.toString() || '');
   const [localKG, setLocalKG] = useState('');

   const { user } = useAuth();

   if (!client) return <View style={styles.container}><Text style={styles.emptyText}>Client not found</Text></View>;

   const updateKGFromModifier = (m: string) => {
      if (m === '' || m === '-') { setLocalKG(''); return; }
      const val = parseInt(m) || 0;
      const kg = ((val * 30) / 7700).toFixed(1).replace('.0', '').replace('-', '');
      setLocalKG(kg);
   };

   const updateModifierFromKG = (kg: string) => {
      setLocalKG(kg);
      if (kg === '') { setLocalModifier(''); return; }
      const val = parseFloat(kg) || 0;
      const cals = Math.round((val * 7700) / 30);
      const sign = client.goal === 'Lose Weight' ? '-' : '';
      setLocalModifier(sign + cals.toString());
   };

   const handleSaveConfig = () => {
      const modifier = parseInt(localModifier);
      editClient({ ...client, customCalorieModifier: isNaN(modifier) ? undefined : modifier });
      setConfigModalVisible(false);
   };

   const handleLogPayment = () => {
      if (!paymentAmount) return;
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount)) return;

      const newPayment = {
         id: Date.now().toString(),
         clientId: clientId,
         amount: amount,
         date: new Date(paymentDate).toISOString(),
         currency: paymentCurrency,
      };

      addPayment(newPayment);
      setPaymentAmount('');
      setPaymentModalVisible(false);
      Alert.alert(t('success'), t('paymentLoggedSuccess'));
   };

   const { min, max } = getHealthyWeightRange(client.heightCM);
   let targetW = Math.round((min + max) / 2);
   if (client.targetWeightKG) {
      targetW = client.targetWeightKG;
   } else if (client.goal === 'Maintain Weight' && latestWeight) {
      targetW = latestWeight.currentWeightKG;
   } else if (client.goal === 'Gain Muscle') {
      targetW = Math.round(max);
   } else if (client.goal === 'Gain Weight') {
      targetW = Math.round(max + 5);
   }

   const calorieDelta = (client.customCalorieModifier !== undefined && client.customCalorieModifier !== null)
      ? client.customCalorieModifier
      : (client.goal === 'Gain Weight' ? settings.gainWeightCals : client.goal === 'Gain Muscle' ? settings.gainMuscleCals : client.goal === 'Lose Weight' ? settings.loseWeightCals : 0);

   let estimatedWeeksRaw = latestWeight ? calculateEstimatedWeeks(latestWeight.currentWeightKG, targetW, calorieDelta) : 'N/A';
   let estimatedWeeksDisplay = estimatedWeeksRaw === '∞' ? t('maintainingStatus') : `${estimatedWeeksRaw} ${t('weeks')}`;
   if (estimatedWeeksRaw === 0) estimatedWeeksDisplay = t('goalReached');
   const attendedCount = attendance.filter(a => a.clientId === client.id && a.attended).length;
   const dateLocale = settings.language === 'km' ? 'km-KH' : 'en-GB';
   const generatedDate = new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
   const oldestWeight = history.length > 0 ? history[history.length - 1].currentWeightKG : null;
   const weightChange = latestWeight && oldestWeight !== null ? Number((latestWeight.currentWeightKG - oldestWeight).toFixed(1)) : null;
   const weightChangeText = weightChange === null ? 'N/A' : `${weightChange > 0 ? '+' : ''}${weightChange} kg`;
   const displayGoal = client.goal === 'Lose Weight' ? t('loseWeight') : client.goal === 'Maintain Weight' ? t('maintainWeight') : client.goal === 'Gain Muscle' ? t('gainMuscle') : t('gainWeight');

   const getReportPdfLabels = () => ({
      generated: t('reportGeneratedLabel'),
      preparedFor: t('reportPreparedFor'),
      date: t('reportDate'),
      generatedBy: t('reportGeneratedBy'),
      mealPlan: t('mealPlanTitle'),
      progressReport: t('progressReportTitle'),
      summary: t('reportSummary'),
      change: t('reportChange'),
      weight: t('reportWeight'),
      category: t('reportCategory'),
      ingredient: t('reportIngredient'),
      portion: t('reportPortion'),
      dailyTargets: t('reportDailyTargets'),
      nutritionTarget: t('reportNutritionTarget'),
      dateLocale,
   });

   const getProgressPdfParams = () => ({
      client: { ...client, goal: displayGoal },
      records: history,
      attendance: attendance.filter(a => a.clientId === client.id),
      targetWeight: targetW.toString(),
      healthyMin: min.toString(),
      healthyMax: max.toString(),
      estimatedWeeks: estimatedWeeksDisplay.toString(),
      labels: getReportPdfLabels(),
      branding: {
         gymLogo: settings.gymLogo,
         gymName: settings.gymName,
         trainerName: settings.trainerName
      }
   });

   const handleShareProgressPdf = async () => {
      setIsSharingPdf(true);
      try {
         await shareClientProgressPdf(getProgressPdfParams());
      } finally {
         setIsSharingPdf(false);
      }
   };

   const handleSaveProgressPdf = async () => {
      setIsSharingPdf(true);
      try {
         await saveClientProgressPdf(getProgressPdfParams());
         Alert.alert(t('success'), t('done'));
      } catch (e: any) {
         Alert.alert("Error", e.message);
      } finally {
         setIsSharingPdf(false);
      }
   };

   const prepareReportImageCapture = async () => {
      setIsCapturingReport(true);
      await new Promise(resolve => setTimeout(resolve, 800));
   };

   const handleShareProgressImage = async () => {
      if (!progressReportRef.current) return;
      setIsSharingPdf(true);
      try {
         await prepareReportImageCapture();
         const uri = await captureRef(progressReportRef.current, {
            format: 'jpg',
            quality: 0.92,
         });
         await shareImageFile(uri, `${getSafeFileName(client.name, 'progress-report')}.jpg`);
      } catch (error: any) {
         Alert.alert('Image Error', error.message || 'Failed to create image.');
      } finally {
         setIsCapturingReport(false);
         setIsSharingPdf(false);
      }
   };

   const handleSaveProgressImage = async () => {
      if (!progressReportRef.current) return;
      setIsSharingPdf(true);
      try {
         await prepareReportImageCapture();
         const uri = await captureRef(progressReportRef.current, {
            format: 'jpg',
            quality: 0.92,
         });
         const success = await saveImageFile(uri, `${getSafeFileName(client.name, 'progress-report')}.jpg`);
         if (success) {
            Alert.alert(t('success'), t('done'));
         }
      } catch (error: any) {
         Alert.alert('Image Error', error.message || 'Failed to save image.');
      } finally {
         setIsCapturingReport(false);
         setIsSharingPdf(false);
      }
   };

   const handleShareComparison = async () => {
      if (!comparisonRef.current) return;
      setIsSharingPdf(true);
      try {
         await new Promise(r => setTimeout(r, 200));
         const uri = await captureRef(comparisonRef.current, {
            format: 'jpg',
            quality: 0.92,
         });
         await shareImageFile(uri, `${getSafeFileName(client.name, 'comparison')}.jpg`);
         Alert.alert(t('success'), t('comparisonSaved'));
      } catch (error: any) {
         Alert.alert('Error', 'Failed to create comparison image');
      } finally {
         setIsSharingPdf(false);
      }
   };

   const handleSaveComparison = async () => {
      if (!comparisonRef.current) return;
      setIsSharingPdf(true);
      try {
         await new Promise(r => setTimeout(r, 200));
         const uri = await captureRef(comparisonRef.current, {
            format: 'jpg',
            quality: 0.92,
         });
         const success = await saveImageFile(uri, `${getSafeFileName(client.name, 'comparison')}.jpg`);
         if (success) {
            Alert.alert(t('success'), t('comparisonSaved'));
         }
      } catch (error: any) {
         Alert.alert('Error', 'Failed to save comparison image');
      } finally {
         setIsSharingPdf(false);
      }
   };

   const runReportAction = async (action: () => Promise<void>) => {
      setReportOptionsVisible(false);
      await action();
   };

   const handleSaveWeight = async () => {
      const w = parseFloat(newWeight);
      if (!w || !user) return;

      setIsSaving(true);
      const uploadedUris: string[] = [];

      try {
         for (const uri of recordPhotoUris) {
            if (uri.startsWith('file://')) {
               const uploadedUrl = await uploadImageToFirebase(uri, user.uid, 'progress_photos');
               uploadedUris.push(uploadedUrl);
            } else {
               uploadedUris.push(uri);
            }
         }
      } catch (e) {
         console.error("Failed to upload progress photos", e);
         Alert.alert("Upload Error", "Some photos failed to upload to the cloud.");
      }

      const newRecord = {
         id: Date.now().toString(),
         clientId: client.id,
         date: new Date().toISOString(),
         currentWeightKG: w,
         bmi: calculateBMI(w, client.heightCM),
         notes: '',
         photoUris: uploadedUris.length > 0 ? uploadedUris : []
      };

      addRecord(newRecord);

      setNewWeight(''); setRecordPhotoUris([]); setModalVisible(false); setIsSaving(false);
   };
   const pickRecordImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.5 });
      if (!result.canceled) {
         const uris = result.assets.map(a => a.uri);
         setRecordPhotoUris(prev => [...prev, ...uris]);
      }
   };

   const handleSaveToGallery = async (uri: string) => {
      try {
         const success = await saveImageToGallery(uri);
         if (success) {
            Alert.alert(t('success'), t('saveToGallery'));
         }
      } catch (error) {
         console.error(error);
         Alert.alert('Error', 'Failed to save photo.');
      }
   };

   const handleDelete = () => {
      Alert.alert(
         t('deleteClient'),
         t('deleteClientConfirm'),
         [
            { text: t('cancel'), style: 'cancel' },
            {
               text: t('delete'), style: 'destructive', onPress: () => {
                  deleteClient(client.id);
                  navigation.goBack();
               }
            }
         ]
      );
   }

   return (
      <ScrollView 
         style={styles.container} 
         keyboardShouldPersistTaps="handled"
         showsVerticalScrollIndicator={false}
      >
         <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={styles.headerTitle}>{t('clientDetailsTitle')}</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
               <TouchableOpacity onPress={() => setPaymentModalVisible(true)}>
                  <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setReportOptionsVisible(true)} disabled={isSharingPdf}>
                  {isSharingPdf ? (
                     <ActivityIndicator color={COLORS.primary} />
                  ) : (
                     <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                  )}
               </TouchableOpacity>
               <TouchableOpacity onPress={() => {
                  setLocalModifier(client.customCalorieModifier?.toString() || '');
                  updateKGFromModifier(client.customCalorieModifier?.toString() || '');
                  setConfigModalVisible(true);
               }}>
                  <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => navigation.navigate('AddClient', { clientId: client.id })}>
                  <Ionicons name="pencil" size={24} color={COLORS.text} />
               </TouchableOpacity>
            </View>
         </View>

         <View style={styles.captureArea}>
            <View ref={progressReportRef} collapsable={false}>
               {isCapturingReport ? (
                  <View style={styles.reportSheet}>
                     <View style={styles.reportHeader}>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.reportKicker}>{t('reportBrand')}</Text>
                           <Text style={styles.reportTitle}>{t('progressReportTitle')}</Text>
                           <Text style={styles.reportSubtle}>{t('reportPreparedFor')} {client.name}</Text>
                           {(settings.gymName || settings.trainerName) && (
                              <View style={{ marginTop: 8 }}>
                                 {settings.gymName && <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: 'bold' }}>{settings.gymName}</Text>}
                                 {settings.trainerName && <Text style={{ color: COLORS.textDim, fontSize: 12 }}>{t('trainer')}: {settings.trainerName}</Text>}
                              </View>
                           )}
                        </View>
                        {settings.gymLogo && (
                           <Image 
                              source={{ uri: settings.gymLogo }} 
                              style={{ width: 60, height: 60, borderRadius: 8, marginLeft: 16 }} 
                              resizeMode="contain"
                           />
                        )}
                        <View style={[styles.reportDateBlock, { marginLeft: 16 }]}>
                           <Text style={styles.reportDateLabel}>{t('reportDate')}</Text>
                           <Text style={styles.reportDateText}>{generatedDate}</Text>
                        </View>
                     </View>

                     <View style={styles.reportClientRow}>
                        {client.imageUri ? (
                           <Image source={{ uri: client.imageUri }} style={styles.reportAvatar} />
                        ) : (
                           <View style={styles.reportAvatarFallback}>
                              <Ionicons name="person" size={34} color={COLORS.textDim} />
                           </View>
                        )}
                        <View style={styles.reportClientInfo}>
                           <Text style={styles.reportClientName}>{client.name}</Text>
                           <Text style={styles.reportSubtle}>{t('age')}: {client.age}  |  {client.gender === 'Male' ? t('male') : t('female')}  |  {t('height')}: {client.heightCM} cm</Text>
                           <Text style={styles.reportGoalLine}>{t('goal')}: {displayGoal}</Text>
                        </View>
                     </View>

                     <Text style={styles.reportSectionTitle}>{t('reportSummary')}</Text>
                     <View style={styles.reportGrid}>
                        <View style={styles.reportMetric}><Text style={styles.reportLabel}>{t('latestWeight')}</Text><Text style={styles.reportValue}>{latestWeight ? latestWeight.currentWeightKG + ' kg' : 'N/A'}</Text></View>
                        <View style={styles.reportMetric}><Text style={styles.reportLabel}>BMI</Text><Text style={styles.reportValue}>{latestWeight ? calculateBMI(latestWeight.currentWeightKG, client.heightCM) : 'N/A'}</Text></View>
                        <View style={styles.reportMetric}><Text style={styles.reportLabel}>{t('targetWeight')}</Text><Text style={styles.reportValue}>{targetW} kg</Text></View>
                        <View style={styles.reportMetric}><Text style={styles.reportLabel}>{t('reportChange')}</Text><Text style={styles.reportValue}>{weightChangeText}</Text></View>
                     </View>

                     <View style={styles.reportHighlightRow}>
                        <View style={styles.reportHighlight}><Text style={styles.reportLabel}>{t('estimatedTime')}</Text><Text style={styles.reportValueAccent}>{estimatedWeeksDisplay}</Text></View>
                        <View style={styles.reportHighlight}><Text style={styles.reportLabel}>{t('attendanceTitle')}</Text><Text style={styles.reportValueAccent}>{attendedCount} {t('sessions')}</Text></View>
                     </View>

                     <Text style={styles.reportRangeText}>{t('standardWeight')}: {min} - {max} kg</Text>

                     <Text style={styles.reportSectionTitle}>{t('progressHistory')}</Text>
                     <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                           <Text style={[styles.reportTh, { flex: 1.3 }]}>{t('reportDate')}</Text>
                           <Text style={styles.reportTh}>{t('reportWeight')}</Text>
                           <Text style={styles.reportTh}>BMI</Text>
                        </View>
                        {history.length === 0 ? (
                           <Text style={styles.reportEmpty}>{t('noRecords')}</Text>
                        ) : history.map(h => (
                           <View key={h.id} style={styles.reportTableRow}>
                              <Text style={[styles.reportTd, { flex: 1.3 }]}>{new Date(h.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                              <Text style={styles.reportTd}>{h.currentWeightKG} kg</Text>
                              <Text style={styles.reportTd}>{h.bmi || calculateBMI(h.currentWeightKG, client.heightCM)}</Text>
                           </View>
                        ))}
                     </View>
                     <Text style={styles.reportFooter}>{t('reportGeneratedBy')}</Text>
                  </View>
               ) : (
                  <>
                     <View style={styles.profileHeader}>
                        <TouchableOpacity style={styles.avatarCircle} onPress={() => client.imageUri && setActiveImage(client.imageUri)}>
                           {client.imageUri ? <Image source={{ uri: client.imageUri }} style={{ width: 76, height: 76, borderRadius: 38 }} /> : <Ionicons name="person" size={40} color={COLORS.textDim} />}
                        </TouchableOpacity>
                        <View style={styles.profileInfo}>
                           <Text style={styles.clientName}>{client.name}</Text>
                           <Text style={styles.clientSub}>{t('goal')}: {displayGoal}</Text>
                           <Text style={styles.clientSub}>{t('age')}: {client.age} | {client.gender === 'Male' ? t('male') : t('female')}</Text>
                           <Text style={styles.clientSub}>{t('height')}: {client.heightCM} cm</Text>
                        </View>
                     </View>

                     <View style={styles.statsCard}>
                        <Text style={styles.statsText}>{t('latestWeight')}: {latestWeight ? latestWeight.currentWeightKG + ' kg' : 'N/A'}</Text>
                        <Text style={styles.statsText}>BMI: {latestWeight ? calculateBMI(latestWeight.currentWeightKG, client.heightCM) : 'N/A'}</Text>
                        <Text style={styles.statsText}>{t('targetWeight')}: {targetW} kg</Text>
                        <Text style={styles.statsText}>{t('standardWeight')}: {min} - {max} kg</Text>
                        <Text style={styles.statsText}>{t('estimatedTime')}: <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{estimatedWeeksDisplay}</Text></Text>
                     </View>

                     <TouchableOpacity style={styles.attendanceRow} onPress={() => navigation.navigate('Attendance', { clientId: client.id })}>
                        <View style={styles.attendanceInfo}>
                           <Ionicons name="calendar" size={24} color={COLORS.primary} />
                           <View style={{ marginLeft: 12 }}>
                              <Text style={styles.attendanceLabel}>{t('attendanceTitle')}</Text>
                              <Text style={styles.attendanceSub}>{attendedCount} {t('sessions')}</Text>
                           </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={COLORS.textDim} />
                     </TouchableOpacity>

                     <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('progressHistory')}</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                           <TouchableOpacity onPress={() => {
                              if (history.length < 2) {
                                 Alert.alert(t('info'), t('noDataForChart'));
                                 return;
                              }
                              setIsSelectingForCompare(!isSelectingForCompare);
                              setSelectedCompareIds([]);
                           }}>
                              <Text style={[styles.addRecordText, isSelectingForCompare && { color: '#ff4444' }]}>
                                 {isSelectingForCompare ? t('cancel') : t('comparePhotos')}
                              </Text>
                           </TouchableOpacity>
                           {!isSelectingForCompare && (
                              <TouchableOpacity onPress={() => setModalVisible(true)}>
                                 <Text style={styles.addRecordText}>{t('addWeight')}</Text>
                              </TouchableOpacity>
                           )}
                        </View>
                     </View>

                     <View style={styles.historyContainer}>
                        {isSelectingForCompare && (
                           <Text style={{ color: COLORS.primary, fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: 'bold' }}>
                              {selectedCompareIds.length === 0 ? t('selectBeforePhoto') : t('selectAfterPhoto')}
                           </Text>
                        )}
                        {history.length === 0 ? (
                           <Text style={styles.emptyText}>{t('noRecords')}</Text>
                        ) : (
                           Object.keys(groupedHistory).map(monthKey => {
                              const isExpanded = expandedMonths.includes(monthKey);
                              return (
                                 <View key={monthKey} style={{ marginBottom: 4 }}>
                                    <TouchableOpacity 
                                       onPress={() => toggleMonth(monthKey)}
                                       style={styles.monthHeader}
                                       activeOpacity={0.7}
                                    >
                                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                          <Ionicons 
                                             name={isExpanded ? "chevron-down" : "chevron-forward"} 
                                             size={18} 
                                             color={COLORS.primary} 
                                          />
                                          <Text style={styles.monthTitle}>{monthKey}</Text>
                                       </View>
                                       <View style={styles.monthBadge}>
                                          <Text style={styles.monthBadgeText}>{groupedHistory[monthKey].length}</Text>
                                       </View>
                                    </TouchableOpacity>

                                    {isExpanded && (
                                       <View style={{ paddingLeft: 8, marginTop: 4 }}>
                                          {groupedHistory[monthKey].map(h => {
                                             const isSelected = selectedCompareIds.includes(h.id);
                                             return (
                                                <TouchableOpacity 
                                                   key={h.id} 
                                                   style={[styles.historyRow, isSelected && { borderColor: COLORS.primary, borderWidth: 1 }]} 
                                                   onPress={() => {
                                                      if (isSelectingForCompare) {
                                                         if (isSelected) {
                                                            setSelectedCompareIds(prev => prev.filter(id => id !== h.id));
                                                         } else {
                                                            const next = [...selectedCompareIds, h.id];
                                                            if (next.length === 2) {
                                                               const before = history.find(r => r.id === next[0]);
                                                               const after = history.find(r => r.id === next[1]);
                                                               if (before && after) {
                                                                  if (new Date(before.date) > new Date(after.date)) {
                                                                     setBeforeRecord(after);
                                                                     setAfterRecord(before);
                                                                  } else {
                                                                     setBeforeRecord(before);
                                                                     setAfterRecord(after);
                                                                  }
                                                               }
                                                               setBeforePhotoIdx(0);
                                                               setAfterPhotoIdx(0);
                                                               resetZoomB();
                                                               resetZoomA();
                                                               setCompareModalVisible(true);
                                                               setIsSelectingForCompare(false);
                                                               setSelectedCompareIds([]);
                                                            } else {
                                                               setSelectedCompareIds(next);
                                                            }
                                                         }
                                                      } else {
                                                         navigation.navigate('ProgressRecord', { recordId: h.id });
                                                      }
                                                   }}
                                                >
                                                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                      {isSelectingForCompare && (
                                                         <Ionicons 
                                                            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                                                            size={22} 
                                                            color={isSelected ? COLORS.primary : COLORS.textDim} 
                                                            style={{ marginRight: 12 }} 
                                                         />
                                                      )}
                                                      <Text style={styles.historyText}>{new Date(h.date).toLocaleDateString(settings.language === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short' })}: {h.currentWeightKG} kg</Text>
                                                   </View>
                                                   {h.photoUris && h.photoUris.length > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}><Ionicons name="camera" size={16} color={COLORS.primary} /><Text style={{ color: COLORS.primary, fontSize: 12, marginLeft: 4 }}>{h.photoUris.length}</Text></View>}
                                                   <View style={{ flex: 1 }} />
                                                   {!isSelectingForCompare && <Ionicons name="chevron-forward" size={20} color={COLORS.textDim} />}
                                                </TouchableOpacity>
                                             );
                                          })}
                                       </View>
                                    )}
                                 </View>
                              );
                           })
                        )}
                     </View>
                  </>
               )}
            </View>
         </View>

         <View style={styles.mealPlanContainer}>
            <View style={styles.mealHeaderRow}>
               <Text style={styles.sectionTitle}>{t('generateMealPlanSection')}</Text>
               <Ionicons name="toggle" size={36} color={COLORS.primary} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 }}>
               <View style={{ alignItems: 'center' }}><Text style={styles.emoji}>🥩</Text><Text style={styles.iconLabel}>{t('meat')}</Text></View>
               <View style={{ alignItems: 'center' }}><Text style={styles.emoji}>🥦</Text><Text style={styles.iconLabel}>{t('vegetables')}</Text></View>
               <View style={{ alignItems: 'center' }}><Text style={styles.emoji}>🍎</Text><Text style={styles.iconLabel}>{t('fruitsLabel')}</Text></View>
               <View style={{ alignItems: 'center' }}><Text style={styles.emoji}>🍞</Text><Text style={styles.iconLabel}>{t('carbsLabel')}</Text></View>
            </View>
            <TouchableOpacity style={styles.generateBtn} onPress={() => navigation.navigate('GenerateMealPlan', { clientId: client.id })}>
               <Text style={styles.generateBtnText}>{t('generateMealPlanBtn')}</Text>
            </TouchableOpacity>
         </View>

         <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" style={{ marginRight: 8 }} />
            <Text style={styles.deleteBtnText}>{t('deleteClient')}</Text>
         </TouchableOpacity>

         {/* Report Options Modal */}
         <Modal visible={reportOptionsVisible} transparent animationType="fade" onRequestClose={() => setReportOptionsVisible(false)}>
            <View style={styles.modalBg}>
               <View style={styles.modalCard}>
                  <View style={styles.modalHeaderRow}>
                     <Text style={styles.modalTitle}>{t('reportShareClient')}</Text>
                     <TouchableOpacity onPress={() => setReportOptionsVisible(false)}>
                        <Ionicons name="close" size={24} color={COLORS.textDim} />
                     </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.reportActionBtn} onPress={() => runReportAction(handleShareProgressImage)}>
                     <Ionicons name="image-outline" size={20} color="#000" />
                     <Text style={styles.reportActionText}>{t('reportShareImage')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportActionBtn} onPress={() => runReportAction(handleSaveProgressImage)}>
                     <Ionicons name="download-outline" size={20} color="#000" />
                     <Text style={styles.reportActionText}>{t('reportSaveImage')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportActionBtn} onPress={() => runReportAction(handleShareProgressPdf)}>
                     <Ionicons name="document-text-outline" size={20} color="#000" />
                     <Text style={styles.reportActionText}>{t('reportSharePdf')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportActionBtn} onPress={() => runReportAction(handleSaveProgressPdf)}>
                     <Ionicons name="folder-outline" size={20} color="#000" />
                     <Text style={styles.reportActionText}>{t('reportSavePdf')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.reportCancelBtn} onPress={() => setReportOptionsVisible(false)}>
                     <Text style={styles.reportCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </Modal>

         {/* Weight Modal */}
         <Modal visible={modalVisible} transparent animationType="slide">
            <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
               <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>{t('addProgress')}</Text>

                  <ScrollView horizontal style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                     {recordPhotoUris.map((uri, idx) => (
                        <Image key={idx} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                     ))}
                     <TouchableOpacity onPress={pickRecordImage} style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="camera" size={24} color={COLORS.textDim} />
                     </TouchableOpacity>
                  </ScrollView>

                  <TextInput style={styles.input} placeholder={t('currentWeight')} placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={newWeight} onChangeText={setNewWeight} autoFocus />
                  <View style={styles.modalActions}>
                     <TouchableOpacity onPress={() => { setModalVisible(false); setNewWeight(''); setRecordPhotoUris([]); }} style={{ padding: 16 }} disabled={isSaving}><Text style={{ color: COLORS.textDim, fontWeight: 'bold' }}>{t('cancel')}</Text></TouchableOpacity>
                     <TouchableOpacity onPress={handleSaveWeight} style={[styles.modalSaveBtn, isSaving && { opacity: 0.5 }]} disabled={isSaving}>
                        <Text style={{ color: '#000', fontWeight: 'bold' }}>{isSaving ? 'Saving...' : t('save')}</Text>
                     </TouchableOpacity>
                  </View>
               </View>
            </KeyboardAvoidingView>
         </Modal>

         {/* Payment Modal */}
         <Modal visible={paymentModalVisible} transparent animationType="slide">
            <View style={styles.modalBg}>
               <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalCard}>
                  <View style={styles.modalHeaderRow}>
                     <Text style={styles.modalTitle}>{t('logPayment')}</Text>
                     <TouchableOpacity onPress={() => setPaymentModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDim} /></TouchableOpacity>
                  </View>

                  <View style={styles.configGroup}>
                     <Text style={styles.configLabel}>{t('amount')}</Text>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 12, paddingHorizontal: 12 }}>
                           <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 18 }}>$</Text>
                           <TextInput 
                              style={[styles.input, { flex: 1, backgroundColor: 'transparent', marginBottom: 0 }]}
                              placeholder="0.00"
                              placeholderTextColor={COLORS.textDim}
                              keyboardType="numeric"
                              value={paymentAmount}
                              onChangeText={setPaymentAmount}
                           />
                        </View>
                     </View>
                  </View>

                  <View style={[styles.configGroup, { marginTop: 10 }]}>
                     <Text style={styles.configLabel}>{t('paymentDate')}</Text>
                     <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 12, paddingHorizontal: 12 }}>
                        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                        <TextInput 
                           style={[styles.input, { flex: 1, backgroundColor: 'transparent', marginBottom: 0 }]}
                           placeholder="YYYY-MM-DD"
                           placeholderTextColor={COLORS.textDim}
                           value={paymentDate}
                           onChangeText={setPaymentDate}
                        />
                     </View>
                  </View>

                  <TouchableOpacity style={styles.configSaveBtn} onPress={handleLogPayment}>
                     <Text style={styles.configSaveBtnText}>{t('save')}</Text>
                  </TouchableOpacity>
               </KeyboardAvoidingView>
            </View>
         </Modal>

         {/* Personal Config Modal */}
         <Modal visible={configModalVisible} transparent animationType="fade">
            <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
               <View style={styles.modalCard}>
                  <View style={styles.modalHeaderRow}>
                     <Text style={styles.modalTitle}>{t('customCalorieTitle')}</Text>
                     <TouchableOpacity onPress={() => setConfigModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDim} /></TouchableOpacity>
                  </View>

                  <Text style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 16 }}>{t('customCalorieDesc')}</Text>

                  <View style={styles.configGroup}>
                     <View style={styles.configRow}>
                        <Text style={styles.configLabel}>{t('modifierKcal')}</Text>
                        <TextInput
                           style={styles.configInput}
                           value={localModifier}
                           onChangeText={(v) => { setLocalModifier(v); updateKGFromModifier(v); }}
                           keyboardType="numbers-and-punctuation"
                           placeholder="0"
                           placeholderTextColor={COLORS.textDim}
                        />
                     </View>

                     <View style={styles.configRow}>
                        <Text style={styles.configLabel}>{client.goal === 'Lose Weight' ? t('targetKGMonthLoss') : t('targetKGMonthGain')}</Text>
                        <TextInput
                           style={[styles.configInput, { color: COLORS.primary, borderColor: COLORS.primary }]}
                           value={localKG}
                           onChangeText={updateModifierFromKG}
                           keyboardType="numeric"
                           placeholder="0.0"
                           placeholderTextColor={COLORS.textDim}
                        />
                     </View>

                     {((client.goal === 'Lose Weight' && parseFloat(localKG) > 4) ||
                        (client.goal === 'Gain Muscle' && parseFloat(localKG) > 3) ||
                        (client.goal === 'Gain Weight' && parseFloat(localKG) > 5)) && (
                           <Text style={styles.warningText}>{t('unhealthyWarning')}</Text>
                        )}
                  </View>

                  <TouchableOpacity style={styles.configSaveBtn} onPress={handleSaveConfig}>
                     <Text style={styles.configSaveBtnText}>{t('save')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={{ marginTop: 12, alignItems: 'center' }}
                     onPress={() => {
                        setLocalModifier('');
                        setLocalKG('');
                        editClient({ ...client, customCalorieModifier: undefined });
                        setConfigModalVisible(false);
                     }}
                  >
                     <Text style={{ color: COLORS.textDim, fontSize: 14 }}>{t('resetToDefault')}</Text>
                  </TouchableOpacity>
               </View>
            </KeyboardAvoidingView>
         </Modal>

         <Modal visible={!!activeImage} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
               <TouchableOpacity style={{ position: 'absolute', top: 60, right: 24, zIndex: 10 }} onPress={() => setActiveImage(null)}>
                  <Ionicons name="close" size={32} color="#fff" />
               </TouchableOpacity>
               {activeImage && <Image source={{ uri: activeImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}

               <TouchableOpacity
                  style={{ position: 'absolute', bottom: 60, backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  onPress={() => activeImage && handleSaveToGallery(activeImage)}
               >
                  <Ionicons name="download-outline" size={20} color="#000" />
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>{t('saveToGallery')}</Text>
               </TouchableOpacity>
            </View>
         </Modal>

         {/* Compare Photos Modal */}
         <Modal visible={compareModalVisible} transparent animationType="slide">
            <GestureHandlerRootView style={{ flex: 1 }}>
               <View style={styles.modalBg}>
                  <View style={[styles.modalCard, { width: '98%', height: '90%', padding: 12 }]}>
                     <View style={styles.modalHeaderRow}>
                        <View>
                           <Text style={styles.modalTitle}>{t('comparePhotos')}</Text>
                           <Text style={{ color: COLORS.textDim, fontSize: 12 }}>{t('reportChange')}: <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{beforeRecord && afterRecord ? (afterRecord.currentWeightKG - beforeRecord.currentWeightKG).toFixed(1) : 0} kg</Text></Text>
                        </View>
                        <TouchableOpacity onPress={() => setCompareModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.textDim} /></TouchableOpacity>
                     </View>

                     <ScrollView showsVerticalScrollIndicator={false}>
                        <View ref={comparisonRef} collapsable={false} style={{ backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' }}>
                           <View style={{ flexDirection: 'row', height: frameHeight }}>
                              {/* Before Column */}
                              <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#333', overflow: 'hidden' }}>
                                 <PanGestureHandler
                                    ref={panRefB}
                                    simultaneousHandlers={pinchRefB}
                                    onGestureEvent={onPanEventB}
                                    onHandlerStateChange={onPanStateChangeB}
                                 >
                                    <Animated.View style={{ flex: 1 }}>
                                       <PinchGestureHandler
                                          ref={pinchRefB}
                                          simultaneousHandlers={panRefB}
                                          onGestureEvent={onPinchEventB}
                                          onHandlerStateChange={onPinchStateChangeB}
                                       >
                                          <Animated.View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                             {beforeRecord?.photoUris?.[beforePhotoIdx] ? (
                                                <Animated.Image 
                                                   source={{ uri: beforeRecord.photoUris[beforePhotoIdx] }} 
                                                   style={{ 
                                                      width: frameWidth, 
                                                      height: frameHeight,
                                                      transform: [
                                                         { translateX: translateX_B },
                                                         { translateY: translateY_B },
                                                         { scale: scaleB }
                                                      ] 
                                                   }} 
                                                   resizeMode="cover" 
                                                />
                                             ) : (
                                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" size={48} color="#333" /></View>
                                             )}
                                          </Animated.View>
                                       </PinchGestureHandler>
                                    </Animated.View>
                                 </PanGestureHandler>
                                 
                                 <View style={{ position: 'absolute', bottom: 8, left: 8, pointerEvents: 'none' }}>
                                    <Text style={{ color: '#c6ff00', fontSize: 16, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }}>BEFORE</Text>
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{beforeRecord ? new Date(beforeRecord.date).toLocaleDateString('en-US') : ''}</Text>
                                    <Text style={{ color: '#fff', fontSize: 10 }}>{beforeRecord?.currentWeightKG} kg</Text>
                                 </View>
                              </View>

                              {/* After Column */}
                              <View style={{ flex: 1, overflow: 'hidden' }}>
                                 <PanGestureHandler
                                    ref={panRefA}
                                    simultaneousHandlers={pinchRefA}
                                    onGestureEvent={onPanEventA}
                                    onHandlerStateChange={onPanStateChangeA}
                                 >
                                    <Animated.View style={{ flex: 1 }}>
                                       <PinchGestureHandler
                                          ref={pinchRefA}
                                          simultaneousHandlers={panRefA}
                                          onGestureEvent={onPinchEventA}
                                          onHandlerStateChange={onPinchStateChangeA}
                                       >
                                          <Animated.View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                             {afterRecord?.photoUris?.[afterPhotoIdx] ? (
                                                <Animated.Image 
                                                   source={{ uri: afterRecord.photoUris[afterPhotoIdx] }} 
                                                   style={{ 
                                                      width: frameWidth, 
                                                      height: frameHeight,
                                                      transform: [
                                                         { translateX: translateX_A },
                                                         { translateY: translateY_A },
                                                         { scale: scaleA }
                                                      ] 
                                                   }} 
                                                   resizeMode="cover" 
                                                />
                                             ) : (
                                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" size={48} color="#333" /></View>
                                             )}
                                          </Animated.View>
                                       </PinchGestureHandler>
                                    </Animated.View>
                                 </PanGestureHandler>

                                 <View style={{ position: 'absolute', bottom: 8, left: 8, pointerEvents: 'none' }}>
                                    <Text style={{ color: '#c6ff00', fontSize: 16, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }}>AFTER</Text>
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{afterRecord ? new Date(afterRecord.date).toLocaleDateString('en-US') : ''}</Text>
                                    <Text style={{ color: '#fff', fontSize: 10 }}>{afterRecord?.currentWeightKG} kg</Text>
                                 </View>
                              </View>
                           </View>
                        </View>


                        {/* Photo selection for the specific chosen records */}
                        <View style={{ marginTop: 16 }}>
                           <View style={{ flexDirection: 'row', gap: 12 }}>
                              <View style={{ flex: 1 }}>
                                 <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>{t('before')} Photos:</Text>
                                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                    {beforeRecord?.photoUris?.map((uri: string, idx: number) => (
                                       <TouchableOpacity key={idx} onPress={() => setBeforePhotoIdx(idx)} style={{ marginRight: 8 }}>
                                          <Image source={{ uri }} style={{ width: 50, height: 50, borderRadius: 6, borderWidth: beforePhotoIdx === idx ? 2 : 0, borderColor: COLORS.primary }} />
                                       </TouchableOpacity>
                                    ))}
                                 </ScrollView>
                              </View>

                              <View style={{ flex: 1 }}>
                                 <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>{t('after')} Photos:</Text>
                                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                    {afterRecord?.photoUris?.map((uri: string, idx: number) => (
                                       <TouchableOpacity key={idx} onPress={() => setAfterPhotoIdx(idx)} style={{ marginRight: 8 }}>
                                          <Image source={{ uri }} style={{ width: 50, height: 50, borderRadius: 6, borderWidth: afterPhotoIdx === idx ? 2 : 0, borderColor: COLORS.primary }} />
                                       </TouchableOpacity>
                                    ))}
                                 </ScrollView>
                              </View>
                           </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, paddingBottom: 20 }}>
                           <TouchableOpacity style={[styles.reportActionBtn, { flex: 1 }]} onPress={handleShareComparison}>
                              <Ionicons name="share-outline" size={18} color="#000" />
                              <Text style={styles.reportActionText}>{t('share')}</Text>
                           </TouchableOpacity>
                           <TouchableOpacity style={[styles.reportActionBtn, { flex: 1 }]} onPress={handleSaveComparison}>
                              <Ionicons name="download-outline" size={18} color="#000" />
                              <Text style={styles.reportActionText}>{t('save')}</Text>
                           </TouchableOpacity>
                        </View>
                     </ScrollView>
                  </View>
               </View>
            </GestureHandlerRootView>
         </Modal>

         {isSharingPdf && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
               <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
         )}

      </ScrollView>
   )
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },
   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
   headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
   captureArea: { backgroundColor: COLORS.background, paddingBottom: 1 },
   reportSheet: { backgroundColor: '#ffffff', padding: 24, marginHorizontal: 0, marginBottom: 18 },
   reportHeader: { borderBottomWidth: 2, borderBottomColor: '#d9e7f7', paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
   reportKicker: { color: '#2b6cb0', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
   reportTitle: { color: '#172033', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
   reportSubtle: { color: '#667085', fontSize: 12 },
   reportDateBlock: { alignItems: 'flex-end', paddingTop: 3 },
   reportDateLabel: { color: '#98a2b3', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
   reportDateText: { color: '#172033', fontSize: 12, fontWeight: 'bold' },
   reportClientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 14, borderLeftWidth: 4, borderLeftColor: '#2b6cb0', marginBottom: 18 },
   reportAvatar: { width: 58, height: 58, borderRadius: 29, marginRight: 14 },
   reportAvatarFallback: { width: 58, height: 58, borderRadius: 29, marginRight: 14, backgroundColor: '#eaf1f8', alignItems: 'center', justifyContent: 'center' },
   reportClientInfo: { flex: 1 },
   reportClientName: { color: '#172033', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
   reportGoalLine: { color: '#2b6cb0', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
   reportSectionTitle: { color: '#172033', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
   reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
   reportMetric: { width: '48.7%', backgroundColor: '#ffffff', padding: 12, borderWidth: 1, borderColor: '#d0d7de' },
   reportHighlightRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
   reportHighlight: { flex: 1, backgroundColor: '#eef6ff', padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
   reportLabel: { color: '#667085', fontSize: 10, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
   reportValue: { color: '#172033', fontSize: 18, fontWeight: 'bold' },
   reportValueAccent: { color: '#1d4ed8', fontSize: 16, fontWeight: 'bold' },
   reportRangeText: { color: '#667085', fontSize: 12, marginBottom: 18 },
   reportTable: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d7de', overflow: 'hidden', marginBottom: 16 },
   reportTableHeader: { flexDirection: 'row', backgroundColor: '#172033', paddingVertical: 9, paddingHorizontal: 12 },
   reportTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
   reportTh: { flex: 1, color: '#ffffff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
   reportTd: { flex: 1, color: '#172033', fontSize: 12, fontWeight: '600' },
   reportEmpty: { color: '#667085', fontSize: 13, textAlign: 'center', padding: 18 },
   reportFooter: { color: '#98a2b3', fontSize: 10, textAlign: 'right' },
   profileHeader: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 24, alignItems: 'center' },
   avatarCircle: { width: 80, height: 80, borderRadius: 40, borderColor: COLORS.primary, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, marginRight: 16 },
   profileInfo: { flex: 1 },
   clientName: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
   clientSub: { color: COLORS.textDim, fontSize: 13, marginBottom: 2 },
   statsCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
   statsText: { color: COLORS.textDim, fontSize: 15, marginBottom: 6 },
   emptyText: { color: COLORS.textDim, fontSize: 16, textAlign: 'center', marginTop: 32 },
   sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
   sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
   addRecordText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
   historyContainer: { backgroundColor: COLORS.surface, marginHorizontal: 16, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 40 },
   historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: COLORS.surfaceLight, borderRadius: 8, marginBottom: 8 },
   historyText: { color: COLORS.textDim, fontSize: 15 },
   addWeightBtn: { position: 'absolute', bottom: -12, right: 16, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, zIndex: 10 },
   addWeightText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
   mealPlanContainer: { backgroundColor: COLORS.surface, marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 40 },
   mealHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
   iconsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
   iconItem: { alignItems: 'center' },
   emoji: { fontSize: 32, marginBottom: 8 },
   iconLabel: { color: COLORS.textDim, fontSize: 12 },
   generateBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center' },
   generateBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
   deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 8, marginHorizontal: 16, marginBottom: 40, borderWidth: 1, borderColor: COLORS.border },
   deleteBtnText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
   modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
   modalCard: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 12, borderColor: COLORS.border, borderWidth: 1 },
   modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
   input: { backgroundColor: COLORS.background, color: COLORS.text, padding: 16, borderRadius: 8, fontSize: 18, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
   modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
   modalSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
   reportActionBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
   reportActionText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
   reportCancelBtn: { padding: 14, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 4 },
   reportCancelText: { color: COLORS.textDim, fontSize: 15, fontWeight: 'bold' },
   attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, marginHorizontal: 16, padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
   attendanceInfo: { flexDirection: 'row', alignItems: 'center' },
   attendanceLabel: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
   attendanceSub: { color: COLORS.textDim, fontSize: 12 },
   modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
   monthTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
   monthBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
   monthBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
   configGroup: { marginBottom: 24 },
   configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
   configLabel: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
   configInput: { backgroundColor: COLORS.background, color: COLORS.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, width: 80, textAlign: 'center' },
   configSaveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center' },
   configSaveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
   warningText: { color: '#ff9800', fontSize: 12, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }
});
