import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { settings, updateSettings, t, restoreDefaultIngredients } = useClients();
  const { user, logout } = useAuth();
  
  const [loseWeight, setLoseWeight] = useState(settings.loseWeightCals.toString());
  const [gainMuscle, setGainMuscle] = useState(settings.gainMuscleCals.toString());
  const [gainWeight, setGainWeight] = useState(settings.gainWeightCals.toString());

  const [loseWeightKG, setLoseWeightKG] = useState(((settings.loseWeightCals * 30) / 7700).toFixed(1).replace('.0', ''));
  const [gainMuscleKG, setGainMuscleKG] = useState(((settings.gainMuscleCals * 30) / 7700).toFixed(1).replace('.0', ''));
  const [gainWeightKG, setGainWeightKG] = useState(((settings.gainWeightCals * 30) / 7700).toFixed(1).replace('.0', ''));

  const updateFromKG = (kg: string, type: 'lose' | 'muscle' | 'weight') => {
    if (type === 'lose') setLoseWeightKG(kg);
    else if (type === 'muscle') setGainMuscleKG(kg);
    else setGainWeightKG(kg);

    if (kg === '') return; // Don't reset calories if user clears the KG box

    const val = parseFloat(kg) || 0;
    const cals = Math.round((val * 7700) / 30);
    if (type === 'lose') setLoseWeight((-cals).toString());
    else if (type === 'muscle') setGainMuscle(cals.toString());
    else setGainWeight(cals.toString());
  };

  const updateFromCals = (cals: string, type: 'lose' | 'muscle' | 'weight') => {
    if (type === 'lose') setLoseWeight(cals);
    else if (type === 'muscle') setGainMuscle(cals);
    else setGainWeight(cals);

    if (cals === '' || cals === '-') return; // Don't reset KG if calorie box is cleared

    const val = parseInt(cals) || 0;
    const kg = ((val * 30) / 7700).toFixed(1).replace('.0', '').replace('-', '');
    if (type === 'lose') setLoseWeightKG(kg);
    else if (type === 'muscle') setGainMuscleKG(kg);
    else setGainWeightKG(kg);
  };

  const handleSave = () => {
     const lw = parseInt(loseWeight);
     const gm = parseInt(gainMuscle);
     const gw = parseInt(gainWeight);
     if (isNaN(lw) || isNaN(gm) || isNaN(gw)) {
        Alert.alert("Error", "Please enter valid numbers");
        return;
     }
     updateSettings({ ...settings, loseWeightCals: lw, gainMuscleCals: gm, gainWeightCals: gw });
     Alert.alert("Success", "Settings saved successfully");
  }

  const handleReset = () => {
     updateFromCals('-500', 'lose');
     updateFromCals('300', 'muscle');
     updateFromCals('500', 'weight');
  }

  const handleRestoreFood = () => {
     Alert.alert(
        t('restoreFoodLibrary'),
        t('restoreFoodLibraryMsg'),
        [
           { text: t('cancel'), style: "cancel" },
           { text: t('restoreFoodLibrary'), onPress: () => {
              restoreDefaultIngredients();
              Alert.alert(t('success'), t('ingredientsRestored'));
           }}
        ]
     );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>{t('account')}</Text>
        </View>
        <Text style={{color: COLORS.text, fontSize: 16, marginBottom: 16}}>{t('loggedInAs')}{user?.email}</Text>
        
        <TouchableOpacity style={[styles.logoutBtn, {borderColor: COLORS.primary, marginBottom: 12}]} onPress={handleRestoreFood}>
          <Text style={[styles.logoutBtnText, {color: COLORS.primary}]}>{t('restoreFoodLibrary')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>{t('logOut')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, {marginTop: 20}]}>
        <View style={styles.cardHeader}>
          <Ionicons name="language" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>{t('language')}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 12}}>
           <TouchableOpacity style={[styles.langBtn, settings.language === 'en' && styles.langBtnActive]} onPress={() => updateSettings({...settings, language: 'en'})}>
              <Text style={[styles.langBtnText, settings.language === 'en' && styles.langBtnTextActive]}>English</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[styles.langBtn, settings.language === 'km' && styles.langBtnActive]} onPress={() => updateSettings({...settings, language: 'km'})}>
              <Text style={[styles.langBtnText, settings.language === 'km' && styles.langBtnTextActive]}>ខ្មែរ (Khmer)</Text>
           </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, {marginTop: 20}]}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>{t('goalPrograms')}</Text>
        </View>
        
        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
             <View style={{flex: 1}}>
                <Text style={styles.settingLabel}>{t('loseWeight')} ({t('cutting')})</Text>
                <Text style={styles.settingSub}>{t('modifierKcal')}</Text>
             </View>
             <TextInput style={styles.input} value={loseWeight} onChangeText={(v) => updateFromCals(v, 'lose')} keyboardType="numbers-and-punctuation" />
          </View>

          <View style={styles.presetContainer}>
             <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Text style={[styles.presetLabel, {marginBottom: 0, flex: 1}]}>{t('targetKGMonthLoss')}</Text>
                <TextInput style={styles.smallInput} value={loseWeightKG} onChangeText={(v) => updateFromKG(v, 'lose')} keyboardType="numeric" placeholder="0.0" />
             </View>
             {parseFloat(loseWeightKG) > 4 && <Text style={styles.warningText}>{t('unhealthyWarning')}</Text>}
          </View>
        </View>

        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
             <View style={{flex: 1}}>
                <Text style={styles.settingLabel}>{t('maintainWeight')}</Text>
                <Text style={styles.settingSub}>{t('maintainSub')}</Text>
             </View>
             <View style={[styles.input, {backgroundColor: 'transparent', borderWidth: 0}]}><Text style={{color: COLORS.textDim, fontSize: 16}}>+ 0</Text></View>
          </View>
        </View>

        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
             <View style={{flex: 1}}>
                <Text style={styles.settingLabel}>{t('gainMuscle')} ({t('leanBulk')})</Text>
                <Text style={styles.settingSub}>{t('modifierKcal')}</Text>
             </View>
             <TextInput style={styles.input} value={gainMuscle} onChangeText={(v) => updateFromCals(v, 'muscle')} keyboardType="numeric" />
          </View>

          <View style={styles.presetContainer}>
             <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Text style={[styles.presetLabel, {marginBottom: 0, flex: 1}]}>{t('targetKGMonthGain')}</Text>
                <TextInput style={styles.smallInput} value={gainMuscleKG} onChangeText={(v) => updateFromKG(v, 'muscle')} keyboardType="numeric" placeholder="0.0" />
             </View>
             {parseFloat(gainMuscleKG) > 3 && <Text style={styles.warningText}>{t('unhealthyWarning')}</Text>}
          </View>
        </View>

        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
             <View style={{flex: 1}}>
                <Text style={styles.settingLabel}>{t('gainWeight')} ({t('heavyBulk')})</Text>
                <Text style={styles.settingSub}>{t('modifierKcal')}</Text>
             </View>
             <TextInput style={styles.input} value={gainWeight} onChangeText={(v) => updateFromCals(v, 'weight')} keyboardType="numeric" />
          </View>

          <View style={styles.presetContainer}>
             <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Text style={[styles.presetLabel, {marginBottom: 0, flex: 1}]}>{t('targetKGMonthGain')}</Text>
                <TextInput style={styles.smallInput} value={gainWeightKG} onChangeText={(v) => updateFromKG(v, 'weight')} keyboardType="numeric" placeholder="0.0" />
             </View>
             {parseFloat(gainWeightKG) > 5 && <Text style={styles.warningText}>{t('unhealthyWarning')}</Text>}
          </View>
        </View>

        <View style={{flexDirection: 'row', gap: 12, marginTop: 24}}>
           <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>{t('resetDefaults')}</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t('saveSettings')}</Text>
           </TouchableOpacity>
        </View>

      </View>

    </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({ 
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  headerTitle: { color: COLORS.text, fontSize: 36, fontWeight: 'bold', marginBottom: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderColor: COLORS.border, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  cardTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  settingGroup: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 20, paddingBottom: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  settingLabel: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  settingSub: { color: COLORS.textDim, fontSize: 12 },
  input: { backgroundColor: COLORS.background, color: COLORS.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, width: 80, textAlign: 'center' },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  resetBtn: { flex: 1, backgroundColor: COLORS.surfaceLight, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  resetBtnText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  langBtn: { flex: 1, padding: 16, borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  langBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langBtnText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  langBtnTextActive: { color: '#000' },
  logoutBtn: { backgroundColor: COLORS.surfaceLight, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ff4444' },
  logoutBtnText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  presetContainer: { marginBottom: 24, paddingLeft: 12 },
  presetLabel: { color: COLORS.textDim, fontSize: 13, marginBottom: 8 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  presetBtn: { backgroundColor: COLORS.background, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  presetBtnText: { color: COLORS.text, fontSize: 12, fontWeight: 'bold' },
  estimatedChange: { color: COLORS.textDim, fontSize: 12, fontStyle: 'italic' },
  smallInput: { backgroundColor: COLORS.background, color: COLORS.primary, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: COLORS.primary, width: 70, textAlign: 'center' },
  warningText: { color: '#ff9800', fontSize: 12, fontWeight: 'bold', marginTop: 4 }
});
