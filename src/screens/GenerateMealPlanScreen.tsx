import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, FlatList } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { calculateBMR } from '../utils/bmrEngine';

export default function GenerateMealPlanScreen({ navigation, route }: any) {
   const params = route?.params || {};
   const clientId = params.clientId || null;
   const { clients, ingredients, records, settings, t } = useClients();
   const client: any = clients.find(c => c.id === clientId) || { goal: 'Lose Weight', heightCM: 180, age: 25 };

   const [activeTab, setActiveTab] = useState('Lunch');
   const [meal, setMeal] = useState<any>({ p: null, c: null, v: null });
   
   const [swapModalVisible, setSwapModalVisible] = useState(false);
   const [activeCategory, setActiveCategory] = useState<'Protein' | 'Carbs' | 'Veggies' | null>(null);

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

   return (
      <View style={{flex: 1, backgroundColor: COLORS.background}}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
         <Text style={styles.headerTitle}>{t('mealPlanTitle')}</Text>
         <View style={{width: 24}} />
      </View>

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
               <Text style={styles.planText}>{meal.p?.name} × {Math.round(150 * servingMultiplier)}g</Text>
               <Ionicons name="sync" size={16} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.macroLabel}>{t('carbs')}</Text>
            <TouchableOpacity style={styles.planItem} onPress={() => handleSwap('Carbs')}>
               {renderMealImg(meal.c)}
               <Text style={styles.planText}>{meal.c?.name} × {Math.round(100 * servingMultiplier)}g</Text>
               <Ionicons name="sync" size={16} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.macroLabel}>{t('veggieFruit')}</Text>
            <TouchableOpacity style={styles.planItem} onPress={() => handleSwap('Veggies')}>
               {renderMealImg(meal.v)}
               <Text style={styles.planText}>{meal.v?.name} × {Math.round(100 * servingMultiplier)}g</Text>
               <Ionicons name="sync" size={16} color={COLORS.primary} />
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
      </ScrollView>

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
   btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
   btnSecondary: { flex: 1, backgroundColor: 'transparent', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary },
   btnSecondaryText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
   btnPrimary: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
   btnPrimaryText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
   modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '70%' },
   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
   swapItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
   swapItemText: { color: COLORS.text, fontSize: 16, flex: 1 },
   swapItemMacros: { color: COLORS.textDim, fontSize: 12 }
});
