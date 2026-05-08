import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { calculateBMR } from '../utils/bmrEngine';
import { getSafeFileName, saveImageFile, saveMealPlanPdf, shareImageFile, shareMealPlanPdf } from '../utils/pdfExport';

export default function GenerateMealPlanScreen({ navigation, route }: any) {
   const params = route?.params || {};
   const clientId = params.clientId || null;
   const { clients, ingredients, records, settings, t } = useClients();
   const client: any = clients.find(c => c.id === clientId) || { goal: 'Lose Weight', heightCM: 180, age: 25 };

   const [activeTab, setActiveTab] = useState('Lunch');
   const [meal, setMeal] = useState<any>({ p: null, c: null, v: null });
   
   const [swapModalVisible, setSwapModalVisible] = useState(false);
   const [activeCategory, setActiveCategory] = useState<'Protein' | 'Carbs' | 'Veggies' | null>(null);
   const [sharingPdf, setSharingPdf] = useState(false);
   const [shareOptionsVisible, setShareOptionsVisible] = useState(false);
   const [isCapturingMealPlan, setIsCapturingMealPlan] = useState(false);
   const mealPlanRef = useRef<View>(null);

   const getRand = (arr: any[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : { name: 'N/A', icon: '❓', proteinBase: 0, carbBase: 0, fatBase: 0 };

   useEffect(() => {
      generateNew();
   }, []);

   const generateNew = () => {
      const proteins = ingredients.filter(i => i.category === 'Protein');
      const carbs = ingredients.filter(i => i.category === 'Carbs');
      const veggies = ingredients.filter(i => i.category === 'Veggies' || i.category === 'Fruits');

      setMeal({
         p: getRand(proteins),
         c: getRand(carbs),
         v: getRand(veggies)
      });
   }

   const history = records.filter(r => r.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   const latestWeight = history.length > 0 ? history[0].currentWeightKG : 70;
   const waterLiters = (latestWeight * 0.033).toFixed(1);

   const bmr = calculateBMR(latestWeight, client.heightCM, client.age || 25, client.gender || 'Male');
   const tdee = bmr * 1.375; // Light activity

   const modifier = (client.customCalorieModifier !== undefined && client.customCalorieModifier !== null)
      ? client.customCalorieModifier 
      : (client.goal === 'Gain Weight' ? settings.gainWeightCals : client.goal === 'Gain Muscle' ? settings.gainMuscleCals : client.goal === 'Lose Weight' ? settings.loseWeightCals : 0);

   const cals = Math.max(1200, Math.round(tdee + modifier));

   const renderMealImg = (item: any) => {
      if (item?.imageUri) return <Image source={{ uri: item.imageUri }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />;
      return <Text style={styles.emoji}>{item?.icon}</Text>;
   };

   const targetMealCals = activeTab === 'Snacks' ? cals * 0.1 : cals * 0.3;
   const baseMealCals = ((meal.p?.calsBase || 0) * 1.5) + (meal.c?.calsBase || 0) + (meal.v?.calsBase || 0);
   const servingMultiplier = baseMealCals > 0 ? targetMealCals / baseMealCals : 1;

   const totalProtein = Math.round((((meal.p?.proteinBase || 0) * 1.5) + (meal.c?.proteinBase || 0) + (meal.v?.proteinBase || 0)) * servingMultiplier);
   const totalCarbs = Math.round((((meal.p?.carbBase || 0) * 1.5) + (meal.c?.carbBase || 0) + (meal.v?.carbBase || 0)) * servingMultiplier);
   const totalFats = Math.round((((meal.p?.fatBase || 0) * 1.5) + (meal.c?.fatBase || 0) + (meal.v?.fatBase || 0)) * servingMultiplier);
   const totalMealCals = Math.round(baseMealCals * servingMultiplier);
   const proteinGrams = Math.round(150 * servingMultiplier);
   const carbGrams = Math.round(100 * servingMultiplier);
   const veggieGrams = Math.round(100 * servingMultiplier);
   const dateLocale = settings.language === 'km' ? 'km-KH' : 'en-GB';
   const generatedDate = new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
   const displayGoal = client.goal === 'Lose Weight' ? t('loseWeight') : client.goal === 'Maintain Weight' ? t('maintainWeight') : client.goal === 'Gain Muscle' ? t('gainMuscle') : t('gainWeight');
   const displayMealName = activeTab === 'Breakfast' ? t('breakfast') : activeTab === 'Lunch' ? t('lunch') : activeTab === 'Dinner' ? t('dinner') : t('snacks');

   const handleSwap = (category: 'Protein' | 'Carbs' | 'Veggies') => {
      setActiveCategory(category);
      setSwapModalVisible(true);
   }

   const selectIngredient = (item: any) => {
      if (activeCategory === 'Protein') setMeal((prev: any) => ({ ...prev, p: item }));
      else if (activeCategory === 'Carbs') setMeal((prev: any) => ({ ...prev, c: item }));
      else setMeal((prev: any) => ({ ...prev, v: item }));
      setSwapModalVisible(false);
   }

   const availableOptions = ingredients.filter(i => {
      if (activeCategory === 'Veggies') return i.category === 'Veggies' || i.category === 'Fruits';
      return i.category === activeCategory;
   });

   const getMealPlanPdfParams = () => ({
      client: { ...client, goal: displayGoal },
      mealName: displayMealName,
      dailyCalories: cals,
      waterLiters,
      proteinItem: meal.p,
      carbItem: meal.c,
      veggieItem: meal.v,
      proteinGrams,
      carbGrams,
      veggieGrams,
      totalProtein,
      totalCarbs,
      totalFats,
      totalMealCals,
      labels: {
         generated: t('reportGeneratedLabel'),
         dateLocale,
         generatedBy: t('reportGeneratedBy'),
         client: t('clientName'),
         name: t('clientName'),
         goal: t('goal'),
         mealPlan: t('mealPlanTitle'),
         dailyCalories: t('recommendedDaily'),
         water: t('recommendedWater'),
         type: t('reportCategory'),
         ingredient: t('reportIngredient'),
         portion: t('reportPortion'),
         baseCalories: t('caloriesKcal'),
         protein: t('protein'),
         carbs: t('carbs'),
         veggieFruit: t('veggieFruit'),
         mealTotals: t('totalMealCals'),
         calories: t('caloriesKcal'),
         fats: t('fats'),
         notes: t('notes'),
         noteWater: t('noteWater'),
         noteSleep: t('noteSleep'),
         noteExercise: t('noteExercise'),
      },
   });

   const handleSharePdf = async () => {
      setSharingPdf(true);
      try {
         await shareMealPlanPdf(getMealPlanPdfParams());
      } finally {
         setSharingPdf(false);
      }
   };

   const handleSavePdf = async () => {
      setSharingPdf(true);
      try {
         await saveMealPlanPdf(getMealPlanPdfParams());
      } finally {
         setSharingPdf(false);
      }
   };

   const prepareMealPlanImageCapture = async () => {
      setIsCapturingMealPlan(true);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
   };

   const handleShareImage = async () => {
      if (!mealPlanRef.current) return;
      setSharingPdf(true);
      try {
         await prepareMealPlanImageCapture();
         const uri = await captureRef(mealPlanRef.current, {
            format: 'jpg',
            quality: 0.92,
         });
         await shareImageFile(uri, `${getSafeFileName(client.name, 'meal-plan')}.jpg`);
      } catch (error: any) {
         Alert.alert('Image Error', error.message || 'Failed to create image.');
      } finally {
         setIsCapturingMealPlan(false);
         setSharingPdf(false);
      }
   };

   const handleSaveImage = async () => {
      if (!mealPlanRef.current) return;
      setSharingPdf(true);
      try {
         await prepareMealPlanImageCapture();
         const uri = await captureRef(mealPlanRef.current, {
            format: 'jpg',
            quality: 0.92,
         });
         await saveImageFile(uri, `${getSafeFileName(client.name, 'meal-plan')}.jpg`);
      } catch (error: any) {
         Alert.alert('Image Error', error.message || 'Failed to save image.');
      } finally {
         setIsCapturingMealPlan(false);
         setSharingPdf(false);
      }
   };

   const runShareAction = async (action: () => Promise<void>) => {
      setShareOptionsVisible(false);
      await action();
   };

   return (
      <View style={{flex: 1, backgroundColor: COLORS.background}}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
         <Text style={styles.headerTitle}>{t('mealPlanTitle')}</Text>
         <View style={{width: 24}} />
      </View>

      <View ref={mealPlanRef} collapsable={false} style={styles.captureArea}>
      {isCapturingMealPlan ? (
         <View style={styles.reportSheet}>
            <View style={styles.reportHeader}>
               <View>
                  <Text style={styles.reportKicker}>{t('reportBrand')}</Text>
                  <Text style={styles.reportTitle}>{t('mealPlanTitle')}</Text>
                  <Text style={styles.reportSubtle}>{t('reportPreparedFor')} {client.name || t('clientName')}</Text>
               </View>
               <View style={styles.reportDateBlock}>
                  <Text style={styles.reportDateLabel}>{t('reportDate')}</Text>
                  <Text style={styles.reportDateText}>{generatedDate}</Text>
               </View>
            </View>

            <View style={styles.reportClientRow}>
               <View style={styles.reportClientInfo}>
                  <Text style={styles.reportClientName}>{client.name || t('clientName')}</Text>
                  <Text style={styles.reportSubtle}>{t('goal')}: {displayGoal}  |  {t('height')}: {client.heightCM} cm</Text>
                  <Text style={styles.reportGoalLine}>{displayMealName} {t('reportNutritionTarget')}</Text>
               </View>
            </View>

            <Text style={styles.reportSectionTitle}>{t('reportDailyTargets')}</Text>
            <View style={styles.reportGrid}>
               <View style={styles.reportMetric}><Text style={styles.reportLabel}>{t('recommendedDaily')}</Text><Text style={styles.reportValue}>{cals} kcal</Text></View>
               <View style={styles.reportMetric}><Text style={styles.reportLabel}>{t('recommendedWater')}</Text><Text style={styles.reportValue}>{waterLiters} L</Text></View>
               <View style={styles.reportMetric}><Text style={styles.reportLabel}>{t('totalMealCals')}</Text><Text style={styles.reportValue}>{totalMealCals} kcal</Text></View>
               <View style={styles.reportMetric}><Text style={styles.reportLabel}>{t('basedOnGoal')}</Text><Text style={styles.reportValueSmall}>{displayGoal}</Text></View>
            </View>

            <View style={styles.reportMacroRow}>
               <View style={styles.reportMacro}><Text style={styles.reportLabel}>{t('protein')}</Text><Text style={styles.reportValueAccent}>{totalProtein}g</Text></View>
               <View style={styles.reportMacro}><Text style={styles.reportLabel}>{t('carbs')}</Text><Text style={styles.reportValueAccent}>{totalCarbs}g</Text></View>
               <View style={styles.reportMacro}><Text style={styles.reportLabel}>{t('fats')}</Text><Text style={styles.reportValueAccent}>{totalFats}g</Text></View>
            </View>

            <Text style={styles.reportSectionTitle}>{t('currentPlan')}</Text>
            <View style={styles.reportMealTable}>
               <View style={styles.reportTableHeader}>
                  <Text style={[styles.reportTh, { flex: 1.1 }]}>{t('reportCategory')}</Text>
                  <Text style={[styles.reportTh, { flex: 1.5 }]}>{t('reportIngredient')}</Text>
                  <Text style={styles.reportTh}>{t('reportPortion')}</Text>
               </View>
               <View style={styles.reportTableRow}>
                  <Text style={[styles.reportTd, { flex: 1.1 }]}>{t('protein')}</Text>
                  <Text style={[styles.reportTd, { flex: 1.5 }]}>{meal.p?.name || 'N/A'}</Text>
                  <Text style={styles.reportTd}>{proteinGrams}g</Text>
               </View>
               <View style={styles.reportTableRow}>
                  <Text style={[styles.reportTd, { flex: 1.1 }]}>{t('carbs')}</Text>
                  <Text style={[styles.reportTd, { flex: 1.5 }]}>{meal.c?.name || 'N/A'}</Text>
                  <Text style={styles.reportTd}>{carbGrams}g</Text>
               </View>
               <View style={styles.reportTableRow}>
                  <Text style={[styles.reportTd, { flex: 1.1 }]}>{t('veggieFruit')}</Text>
                  <Text style={[styles.reportTd, { flex: 1.5 }]}>{meal.v?.name || 'N/A'}</Text>
                  <Text style={styles.reportTd}>{veggieGrams}g</Text>
               </View>
            </View>

            <View style={styles.reportNotes}>
               <Text style={styles.reportSectionTitle}>{t('mealPlanNote')}</Text>
               <Text style={styles.reportNoteText}>- {t('noteWater')}</Text>
               <Text style={styles.reportNoteText}>- {t('noteSleep')}</Text>
               <Text style={styles.reportNoteText}>- {t('noteExercise')}</Text>
            </View>
            <Text style={styles.reportFooter}>{t('reportGeneratedBy')}</Text>
         </View>
      ) : (
      <>
      <View style={styles.calsCard}>
         <Text style={styles.calsSub}>{t('recommendedDaily')}: <Text style={styles.calsValue}>{cals} kcal</Text></Text>
         <Text style={styles.calsSub}>{t('recommendedWater')}: <Text style={styles.calsValue}>{waterLiters} L</Text></Text>
         <Text style={styles.subCals}>({t('basedOnGoal')}: {client.goal})</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ gap: 16, paddingHorizontal: 24 }}>
         {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(tab => {
             const mappedTab = tab === 'Breakfast' ? t('breakfast') : tab === 'Lunch' ? t('lunch') : tab === 'Dinner' ? t('dinner') : t('snacks');
             return (
               <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => { setActiveTab(tab); generateNew(); }}>
                 <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{mappedTab}</Text>
               </TouchableOpacity>
             );
         })}
      </ScrollView>

         <View style={styles.planContainer}>
            <Text style={styles.colTitle}>{t('currentPlan')}</Text>

            <Text style={styles.macroLabel}>{t('protein')}</Text>
            <TouchableOpacity style={styles.planItem} onPress={() => handleSwap('Protein')}>
               {renderMealImg(meal.p)}
               <Text style={styles.planText}>{meal.p?.name} × {proteinGrams}g</Text>
               {!isCapturingMealPlan && <Ionicons name="sync" size={16} color={COLORS.primary} />}
            </TouchableOpacity>

            <Text style={styles.macroLabel}>{t('carbs')}</Text>
            <TouchableOpacity style={styles.planItem} onPress={() => handleSwap('Carbs')}>
               {renderMealImg(meal.c)}
               <Text style={styles.planText}>{meal.c?.name} × {carbGrams}g</Text>
               {!isCapturingMealPlan && <Ionicons name="sync" size={16} color={COLORS.primary} />}
            </TouchableOpacity>

            <Text style={styles.macroLabel}>{t('veggieFruit')}</Text>
            <TouchableOpacity style={styles.planItem} onPress={() => handleSwap('Veggies')}>
               {renderMealImg(meal.v)}
               <Text style={styles.planText}>{meal.v?.name} × {veggieGrams}g</Text>
               {!isCapturingMealPlan && <Ionicons name="sync" size={16} color={COLORS.primary} />}
            </TouchableOpacity>
         </View>

         <View style={styles.macroSummaryBox}>
            <Text style={styles.macroSummaryText}>{t('protein')}: {totalProtein}g | {t('carbs')}: {totalCarbs}g | {t('fats')}: {totalFats}g</Text>
            <Text style={[styles.macroSummaryText, { color: COLORS.primary, fontWeight: 'bold', marginTop: 4 }]}>{t('totalMealCals')}: {totalMealCals} kcal</Text>
         </View>

         <View style={styles.directionsCard}>
            <Text style={styles.directionsTitle}>{t('mealPlanNote')}</Text>
            <Text style={styles.directionsText}>• {t('noteWater')}</Text>
            <Text style={styles.directionsText}>• {t('noteSleep')}</Text>
            <Text style={styles.directionsText}>• {t('noteExercise')}</Text>

            <View style={styles.btnRow}>
               <TouchableOpacity style={styles.btnPdf} onPress={() => setShareOptionsVisible(true)} disabled={sharingPdf}>
                  {sharingPdf ? (
                     <ActivityIndicator color={COLORS.primary} />
                  ) : (
                     <>
                        <Ionicons name="document-text-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.btnSecondaryText}>PDF</Text>
                     </>
                  )}
               </TouchableOpacity>
               <TouchableOpacity style={styles.btnSecondary} onPress={generateNew}>
                  <Ionicons name="refresh" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.btnSecondaryText}>{t('reRoll')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
                  <Ionicons name="checkmark-circle" size={18} color="#000" style={{ marginRight: 6 }} />
                  <Text style={styles.btnPrimaryText}>{t('confirmMealPlan')}</Text>
               </TouchableOpacity>
            </View>
         </View>
      </>
      )}
      </View>
      </ScrollView>

      <Modal visible={shareOptionsVisible} transparent animationType="fade" onRequestClose={() => setShareOptionsVisible(false)}>
         <View style={styles.modalOverlayCenter}>
            <View style={styles.shareModalCard}>
               <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('reportShareMeal')}</Text>
                  <TouchableOpacity onPress={() => setShareOptionsVisible(false)}>
                     <Ionicons name="close" size={24} color={COLORS.textDim} />
                  </TouchableOpacity>
               </View>

               <TouchableOpacity style={styles.shareActionBtn} onPress={() => runShareAction(handleShareImage)}>
                  <Ionicons name="image-outline" size={20} color="#000" />
                  <Text style={styles.shareActionText}>{t('reportShareImage')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.shareActionBtn} onPress={() => runShareAction(handleSaveImage)}>
                  <Ionicons name="download-outline" size={20} color="#000" />
                  <Text style={styles.shareActionText}>{t('reportSaveImage')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.shareActionBtn} onPress={() => runShareAction(handleSharePdf)}>
                  <Ionicons name="document-text-outline" size={20} color="#000" />
                  <Text style={styles.shareActionText}>{t('reportSharePdf')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.shareActionBtn} onPress={() => runShareAction(handleSavePdf)}>
                  <Ionicons name="folder-outline" size={20} color="#000" />
                  <Text style={styles.shareActionText}>{t('reportSavePdf')}</Text>
               </TouchableOpacity>

               <TouchableOpacity style={styles.shareCancelBtn} onPress={() => setShareOptionsVisible(false)}>
                  <Text style={styles.shareCancelText}>{t('cancel')}</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

      <Modal visible={swapModalVisible} animationType="slide" transparent>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('swapIngredient')}</Text>
                  <TouchableOpacity onPress={() => setSwapModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
               </View>
               <FlatList 
                  data={availableOptions}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => (
                     <TouchableOpacity style={styles.swapItem} onPress={() => selectIngredient(item)}>
                        {renderMealImg(item)}
                        <Text style={styles.swapItemText}>{item.name}</Text>
                        <Text style={styles.swapItemMacros}>{item.calsBase} kcal/100g</Text>
                     </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{color: COLORS.textDim, textAlign: 'center', marginTop: 20}}>{t('noIngredients')}</Text>}
               />
            </View>
         </View>
      </Modal>
      </View>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },
   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
   headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
   captureArea: { backgroundColor: COLORS.background, paddingBottom: 1 },
   reportSheet: { backgroundColor: '#ffffff', padding: 24 },
   reportHeader: { borderBottomWidth: 2, borderBottomColor: '#d9e7f7', paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
   reportKicker: { color: '#2b6cb0', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
   reportTitle: { color: '#172033', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
   reportSubtle: { color: '#667085', fontSize: 12 },
   reportDateBlock: { alignItems: 'flex-end', paddingTop: 3 },
   reportDateLabel: { color: '#98a2b3', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
   reportDateText: { color: '#172033', fontSize: 12, fontWeight: 'bold' },
   reportClientRow: { backgroundColor: '#f8fafc', padding: 14, borderLeftWidth: 4, borderLeftColor: '#2b6cb0', marginBottom: 18 },
   reportClientInfo: { flex: 1 },
   reportClientName: { color: '#172033', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
   reportGoalLine: { color: '#2b6cb0', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
   reportSectionTitle: { color: '#172033', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
   reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
   reportMetric: { width: '48.7%', backgroundColor: '#ffffff', padding: 12, borderWidth: 1, borderColor: '#d0d7de' },
   reportLabel: { color: '#667085', fontSize: 10, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
   reportValue: { color: '#172033', fontSize: 18, fontWeight: 'bold' },
   reportValueSmall: { color: '#172033', fontSize: 14, fontWeight: 'bold' },
   reportValueAccent: { color: '#1d4ed8', fontSize: 17, fontWeight: 'bold' },
   reportMacroRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
   reportMacro: { flex: 1, backgroundColor: '#eef6ff', padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
   reportMealTable: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d0d7de', overflow: 'hidden', marginBottom: 16 },
   reportTableHeader: { flexDirection: 'row', backgroundColor: '#172033', paddingVertical: 9, paddingHorizontal: 12 },
   reportTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
   reportTh: { flex: 1, color: '#ffffff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
   reportTd: { flex: 1, color: '#172033', fontSize: 12, fontWeight: '600' },
   reportNotes: { backgroundColor: '#f8fafc', padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
   reportNoteText: { color: '#475467', fontSize: 12, marginBottom: 5 },
   reportFooter: { color: '#98a2b3', fontSize: 10, textAlign: 'right' },
   tabScroll: { maxHeight: 50, marginBottom: 16 },
   tabBtn: { paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
   tabBtnActive: { borderBottomColor: COLORS.primary },
   tabText: { color: COLORS.textDim, fontSize: 16 },
   tabTextActive: { color: COLORS.text, fontWeight: 'bold' },
   calsCard: { backgroundColor: COLORS.surfaceLight, marginHorizontal: 24, padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center' },
   calsSub: { color: COLORS.textDim, fontSize: 15, marginBottom: 4 },
   calsValue: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
   subCals: { color: COLORS.textDim, fontSize: 13 },
   planContainer: { paddingHorizontal: 24, marginBottom: 16 },
   colTitle: { color: COLORS.text, fontSize: 16, marginBottom: 12, fontWeight: 'bold' },
   emoji: { fontSize: 20, marginRight: 8 },
   macroLabel: { color: COLORS.textDim, fontSize: 12, marginBottom: 6, marginTop: 4 },
   planItem: { backgroundColor: COLORS.surfaceLight, padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
   planText: { color: COLORS.text, fontSize: 13, flex: 1 },
   macroSummaryBox: { borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center', marginBottom: 16 },
   macroSummaryText: { color: COLORS.textDim, fontSize: 14 },
   directionsCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 16 },
   directionsTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
   directionsText: { color: COLORS.text, fontSize: 13, marginBottom: 4 },
   btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
   btnPdf: { width: 76, backgroundColor: 'transparent', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary },
   btnSecondary: { flex: 1, backgroundColor: 'transparent', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary },
   btnSecondaryText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
   btnPrimary: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
   btnPrimaryText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
   modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
   shareModalCard: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
   shareActionBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
   shareActionText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
   shareCancelBtn: { padding: 14, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 4 },
   shareCancelText: { color: COLORS.textDim, fontSize: 15, fontWeight: 'bold' },
   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
   modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '70%' },
   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
   swapItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
   swapItemText: { color: COLORS.text, fontSize: 16, flex: 1 },
   swapItemMacros: { color: COLORS.textDim, fontSize: 12 }
});
