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
     setLoseWeight('-500');
     setGainMuscle('300');
     setGainWeight('500');
     // We don't automatically save, we just reset the input fields so the user can verify, then save.
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
        
        <View style={styles.settingRow}>
           <View style={{flex: 1}}>
              <Text style={styles.settingLabel}>{t('loseWeight')} (Cutting)</Text>
              <Text style={styles.settingSub}>{t('modifierSub')}</Text>
           </View>
           <TextInput style={styles.input} value={loseWeight} onChangeText={setLoseWeight} keyboardType="numbers-and-punctuation" />
        </View>

        <View style={styles.settingRow}>
           <View style={{flex: 1}}>
              <Text style={styles.settingLabel}>{t('maintainWeight')}</Text>
              <Text style={styles.settingSub}>{t('maintainSub')}</Text>
           </View>
           <View style={[styles.input, {backgroundColor: 'transparent', borderWidth: 0}]}><Text style={{color: COLORS.textDim, fontSize: 16}}>+ 0</Text></View>
        </View>

        <View style={styles.settingRow}>
           <View style={{flex: 1}}>
              <Text style={styles.settingLabel}>{t('gainMuscle')} (Lean Bulk)</Text>
              <Text style={styles.settingSub}>{t('modifierSub')}</Text>
           </View>
           <TextInput style={styles.input} value={gainMuscle} onChangeText={setGainMuscle} keyboardType="numeric" />
        </View>

        <View style={styles.settingRow}>
           <View style={{flex: 1}}>
              <Text style={styles.settingLabel}>{t('gainWeight')} (Heavy Bulk)</Text>
              <Text style={styles.settingSub}>{t('modifierSub')}</Text>
           </View>
           <TextInput style={styles.input} value={gainWeight} onChangeText={setGainWeight} keyboardType="numeric" />
        </View>

        <View style={{flexDirection: 'row', gap: 12, marginTop: 12}}>
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
  settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 16 },
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
  logoutBtnText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' }
});
