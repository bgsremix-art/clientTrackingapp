import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export default function SettingsScreen() {
  const { settings, updateSettings, t, restoreDefaultIngredients } = useClients();
  const { user, logout } = useAuth();
  
  const [loseWeight, setLoseWeight] = useState(settings.loseWeightCals.toString());
  const [gainMuscle, setGainMuscle] = useState(settings.gainMuscleCals.toString());
  const [gainWeight, setGainWeight] = useState(settings.gainWeightCals.toString());
  const [gymName, setGymName] = useState(settings.gymName || '');
  const [trainerName, setTrainerName] = useState(settings.trainerName || '');
  const [gymLogo, setGymLogo] = useState(settings.gymLogo || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  const [loseWeightKG, setLoseWeightKG] = useState(((settings.loseWeightCals * 30) / 7700).toFixed(1).replace('.0', ''));
  const [gainMuscleKG, setGainMuscleKG] = useState(((settings.gainMuscleCals * 30) / 7700).toFixed(1).replace('.0', ''));
  const [gainWeightKG, setGainWeightKG] = useState(((settings.gainWeightCals * 30) / 7700).toFixed(1).replace('.0', ''));

  // Sync local state when settings are loaded/updated from context
  React.useEffect(() => {
    setGymName(settings.gymName || '');
    setTrainerName(settings.trainerName || '');
    setGymLogo(settings.gymLogo || '');
    setLoseWeight(settings.loseWeightCals.toString());
    setGainMuscle(settings.gainMuscleCals.toString());
    setGainWeight(settings.gainWeightCals.toString());
    
    // Update KG states as well
    const lw = settings.loseWeightCals;
    const gm = settings.gainMuscleCals;
    const gw = settings.gainWeightCals;
    setLoseWeightKG(((lw * 30) / 7700).toFixed(1).replace('.0', '').replace('-', ''));
    setGainMuscleKG(((gm * 30) / 7700).toFixed(1).replace('.0', ''));
    setGainWeightKG(((gw * 30) / 7700).toFixed(1).replace('.0', ''));
  }, [settings]);

  const updateFromKG = (kg: string, type: 'lose' | 'muscle' | 'weight') => {
    if (type === 'lose') setLoseWeightKG(kg);
    else if (type === 'muscle') setGainMuscleKG(kg);
    else setGainWeightKG(kg);

    if (kg === '') return;

    const val = parseFloat(kg) || 0;
    const cals = Math.round((val * 7700) / 30);
    if (type === 'lose') setLoseWeight(cals.toString());
    else if (type === 'muscle') setGainMuscle(cals.toString());
    else setGainWeight(cals.toString());
  };

  const updateFromCals = (cals: string, type: 'lose' | 'muscle' | 'weight') => {
    if (type === 'lose') setLoseWeight(cals);
    else if (type === 'muscle') setGainMuscle(cals);
    else setGainWeight(cals);

    if (cals === '' || cals === '-') return;

    const val = parseInt(cals) || 0;
    const kg = ((val * 30) / 7700).toFixed(1).replace('.0', '').replace('-', '');
    if (type === 'lose') setLoseWeightKG(kg);
    else if (type === 'muscle') setGainMuscleKG(kg);
    else setGainWeightKG(kg);
  };

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "We need access to your photos to select a logo.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400 } }], 
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const localPath = `${FileSystem.documentDirectory}gym_logo_${Date.now()}.jpg`;
        
        await FileSystem.moveAsync({
          from: manipResult.uri,
          to: localPath
        });

        setGymLogo(localPath);
        updateSettings({
          ...settings,
          gymLogo: localPath
        });
        Alert.alert(t('success'), t('logoSaved') || 'Logo saved to device!');
      } catch (e: any) {
        console.log('Logo save error:', e);
        Alert.alert("Error", `Failed to save logo: ${e.message || 'Unknown error'}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      t('removeLogo') || 'Remove Logo',
      t('removeLogoMsg') || 'Are you sure you want to remove the gym logo?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('remove') || 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            setGymLogo('');
            await updateSettings({
              ...settings,
              gymLogo: ''
            });
          }
        }
      ]
    );
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await updateSettings({
        ...settings,
        gymName,
        trainerName,
        gymLogo
      });
      Alert.alert(t('success'), t('logoSaved'));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveGoals = async () => {
    const lw = parseInt(loseWeight);
    const gm = parseInt(gainMuscle);
    const gw = parseInt(gainWeight);

    if (isNaN(lw) || isNaN(gm) || isNaN(gw)) {
       Alert.alert("Error", "Please enter valid numbers");
       return;
    }

    setIsSavingGoals(true);
    try {
      await updateSettings({ 
        ...settings, 
        loseWeightCals: lw, 
        gainMuscleCals: gm, 
        gainWeightCals: gw
      });
      Alert.alert(t('success'), t('settingsUpdated'));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSavingGoals(false);
    }
  };

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
        {
          text: t('restoreFoodLibrary'), onPress: () => {
            restoreDefaultIngredients();
            Alert.alert(t('success'), t('ingredientsRestored'));
          }
        }
      ]
    );
  };

  const handleResendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        Alert.alert(t('verifyEmailTitle'), t('verificationEmailSent'));
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>{t('account')}</Text>
          </View>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: COLORS.text, fontSize: 16, marginBottom: 4 }} numberOfLines={1} ellipsizeMode="middle">{t('loggedInAs')}{user?.email}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons
                name={user?.emailVerified ? "checkmark-circle" : "warning"}
                size={16}
                color={user?.emailVerified ? "#4CAF50" : "#FFC107"}
                style={{ marginRight: 4 }}
              />
              <Text style={{ color: user?.emailVerified ? "#4CAF50" : "#FFC107", fontSize: 14, fontWeight: 'bold' }}>
                {user?.emailVerified ? "Verified" : "Unverified"}
              </Text>
              {!user?.emailVerified && (
                <TouchableOpacity onPress={handleResendVerification} style={{ marginLeft: 12 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                    {t('resendEmail')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {(() => {
              const getRemainingDays = () => {
                if (!settings.subscriptionExpiry) return 0;
                const expiry = new Date(settings.subscriptionExpiry);
                const diff = expiry.getTime() - new Date().getTime();
                return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
              };
              const days = getRemainingDays();
              const expiryDate = settings.subscriptionExpiry ? new Date(settings.subscriptionExpiry).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
              
              return (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ color: days > 0 ? COLORS.primary : COLORS.textDim, fontSize: 14, fontWeight: 'bold' }}>
                    {t('remainingDays')}{days} {t('daysRemaining').toLowerCase()}
                  </Text>
                  {settings.subscriptionExpiry && (
                    <Text style={{ color: COLORS.textDim, fontSize: 12, marginTop: 2 }}>
                      {t('expiryDate')}: <Text style={{ color: COLORS.text, fontWeight: '600' }}>{expiryDate}</Text>
                    </Text>
                  )}
                </View>
              );
            })()}
          </View>

          <TouchableOpacity style={[styles.logoutBtn, { borderColor: COLORS.primary, marginBottom: 12 }]} onPress={handleRestoreFood}>
            <Text style={[styles.logoutBtnText, { color: COLORS.primary }]}>{t('restoreFoodLibrary')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>{t('logOut')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { marginTop: 20 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="business" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>{t('gymBranding')}</Text>
          </View>
          <Text style={styles.settingLabel}>{t('trainerNameLabel') || 'Trainer Name'}</Text>
          <TextInput 
            style={[styles.input, { width: '100%', textAlign: 'left', marginBottom: 20 }]} 
            value={trainerName} 
            onChangeText={setTrainerName} 
            placeholder={t('enterYourName')}
            placeholderTextColor={COLORS.textDim}
          />
          <Text style={styles.settingLabel}>{t('gymNameLabel')}</Text>
          <TextInput 
            style={[styles.input, { width: '100%', textAlign: 'left', marginBottom: 20 }]} 
            value={gymName} 
            onChangeText={setGymName} 
            placeholder={t('enterGymName')}
            placeholderTextColor={COLORS.textDim}
          />
          <Text style={styles.settingLabel}>{t('uploadGymLogo')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View>
              <TouchableOpacity 
                style={[styles.langBtn, { flex: 0, width: 80, height: 80, padding: 0, justifyContent: 'center' }]} 
                onPress={handlePickLogo}
                disabled={isUploading}
              >
                {gymLogo ? (
                  <Image source={{ uri: gymLogo }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                ) : (
                  <Ionicons name="image-outline" size={32} color={COLORS.textDim} />
                )}
              </TouchableOpacity>
              {gymLogo ? (
                <TouchableOpacity 
                  style={styles.removeLogoBadge} 
                  onPress={handleRemoveLogo}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.textDim, fontSize: 12 }}>
                {isUploading ? t('uploading') : t('logoHelper')}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.saveBtn, { marginTop: 20, alignSelf: 'flex-end', width: 'auto', paddingHorizontal: 24 }, isSavingBranding && { opacity: 0.7 }]} 
            onPress={handleSaveBranding}
            disabled={isSavingBranding}
          >
            {isSavingBranding ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>{t('save') || 'Save Branding'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { marginTop: 20 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="language" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>{t('language')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.langBtn, settings.language === 'en' && styles.langBtnActive]} onPress={() => updateSettings({ ...settings, language: 'en' })}>
              <Text style={[styles.langBtnText, settings.language === 'en' && styles.langBtnTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langBtn, settings.language === 'km' && styles.langBtnActive]} onPress={() => updateSettings({ ...settings, language: 'km' })}>
              <Text style={[styles.langBtnText, settings.language === 'km' && styles.langBtnTextActive]}>ខ្មែរ (Khmer)</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 20 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>{t('goalPrograms')}</Text>
          </View>

          <View style={styles.settingGroup}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('loseWeight')} ({t('cutting')})</Text>
                <Text style={styles.settingSub}>{t('modifierKcal')}</Text>
              </View>
              <TextInput style={styles.input} value={loseWeight} onChangeText={(v) => updateFromCals(v, 'lose')} keyboardType="numbers-and-punctuation" />
            </View>

            <View style={styles.presetContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.presetLabel, { marginBottom: 0, flex: 1 }]}>{t('targetKGMonthLoss')}</Text>
                <TextInput style={styles.smallInput} value={loseWeightKG} onChangeText={(v) => updateFromKG(v, 'lose')} keyboardType="numeric" placeholder="0.0" />
              </View>
              {parseFloat(loseWeightKG) > 4 && <Text style={styles.warningText}>{t('unhealthyWarning')}</Text>}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('maintainWeight')}</Text>
                <Text style={styles.settingSub}>{t('maintainSub')}</Text>
              </View>
              <View style={[styles.input, { backgroundColor: 'transparent', borderWidth: 0 }]}><Text style={{ color: COLORS.textDim, fontSize: 16 }}>+ 0</Text></View>
            </View>
          </View>

          <View style={styles.settingGroup}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('gainMuscle')} ({t('leanBulk')})</Text>
                <Text style={styles.settingSub}>{t('modifierKcal')}</Text>
              </View>
              <TextInput style={styles.input} value={gainMuscle} onChangeText={(v) => updateFromCals(v, 'muscle')} keyboardType="numeric" />
            </View>

            <View style={styles.presetContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.presetLabel, { marginBottom: 0, flex: 1 }]}>{t('targetKGMonthGain')}</Text>
                <TextInput style={styles.smallInput} value={gainMuscleKG} onChangeText={(v) => updateFromKG(v, 'muscle')} keyboardType="numeric" placeholder="0.0" />
              </View>
              {parseFloat(gainMuscleKG) > 3 && <Text style={styles.warningText}>{t('unhealthyWarning')}</Text>}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('gainWeight')} ({t('heavyBulk')})</Text>
                <Text style={styles.settingSub}>{t('modifierKcal')}</Text>
              </View>
              <TextInput style={styles.input} value={gainWeight} onChangeText={(v) => updateFromCals(v, 'weight')} keyboardType="numeric" />
            </View>

            <View style={styles.presetContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.presetLabel, { marginBottom: 0, flex: 1 }]}>{t('targetKGMonthGain')}</Text>
                <TextInput style={styles.smallInput} value={gainWeightKG} onChangeText={(v) => updateFromKG(v, 'weight')} keyboardType="numeric" placeholder="0.0" />
              </View>
              {parseFloat(gainWeightKG) > 5 && <Text style={styles.warningText}>{t('unhealthyWarning')}</Text>}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>{t('resetDefaults')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, isSavingGoals && { opacity: 0.7 }]} 
              onPress={handleSaveGoals}
              disabled={isSavingGoals}
            >
              {isSavingGoals ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.saveBtnText}>{t('save') || 'Save Goals'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  warningText: { color: '#ff9800', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  removeLogoBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ff4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface }
});
