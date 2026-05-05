import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from './DashboardScreen';
import { GoalType } from '../models/types';
import { useClients } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { uploadImageToFirebase } from '../utils/firebaseStorage';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { calculateBMR, calculateBMI } from '../utils/bmrEngine';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddClient'>;
  route: RouteProp<RootStackParamList, 'AddClient'>;
};

export default function AddClientScreen({ navigation, route }: Props) {
  const { addClient, editClient, clients, addRecord, t } = useClients();
  const { user } = useAuth();
  const editingId = route?.params?.clientId;
  const existingClient = clients.find(c => c.id === editingId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<GoalType>('Lose Weight');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingClient) {
      setName(existingClient.name);
      setPhone(existingClient.phone);
      setEmail(existingClient.email || '');
      setAge(existingClient.age?.toString() || '');
      setGender(existingClient.gender || 'Male');
      setHeight(existingClient.heightCM?.toString() || '');
      setGoal(existingClient.goal);
      if (existingClient.targetWeightKG) setTargetWeight(existingClient.targetWeightKG.toString());
      if (existingClient.imageUri) setImageUri(existingClient.imageUri);
    }
  }, [existingClient]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name || !height || !user) return;
    
    setIsSaving(true);
    let finalImageUri = imageUri;

    if (imageUri && imageUri.startsWith('file://')) {
      try {
        finalImageUri = await uploadImageToFirebase(imageUri, user.uid, 'avatars');
      } catch (e) {
        console.error("Failed to upload avatar", e);
      }
    }
    
    const clientData: any = {
      id: editingId || Date.now().toString(),
      name,
      phone,
      email,
      age: parseInt(age) || 0,
      gender,
      heightCM: parseInt(height) || 0,
      goal
    };

    if (parseFloat(targetWeight)) clientData.targetWeightKG = parseFloat(targetWeight);
    if (finalImageUri) clientData.imageUri = finalImageUri;

    if (editingId) {
      editClient(clientData);
    } else {
      addClient(clientData);
      
      const cw = parseFloat(currentWeight);
      if (cw) {
        addRecord({
           id: Date.now().toString() + "_rec",
           clientId: clientData.id,
           date: new Date().toISOString(),
           currentWeightKG: cw,
           bmi: calculateBMI(cw, clientData.heightCM),
           notes: 'Initial weight'
        });
      }
    }
    setIsSaving(false);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      <View style={styles.headerAvatar}>
        <TouchableOpacity style={styles.avatarCircle} onPress={pickImage}>
          {imageUri ? <Image source={{uri: imageUri}} style={styles.avatarImg} /> : <Ionicons name="person" size={54} color={COLORS.textDim} />}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{t('clientName')}</Text>
      <TextInput style={[styles.input, styles.inputActive]} value={name} onChangeText={setName} placeholder={t('namePlaceholder')} placeholderTextColor={COLORS.textDim} />
      
      <Text style={styles.label}>{t('currentObjective')}</Text>
      <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
        <TouchableOpacity style={[styles.objectiveBtn, {backgroundColor: COLORS.surface}, goal === 'Lose Weight' && styles.objectiveBtnActive]} onPress={() => setGoal('Lose Weight')}>
          <Text style={[styles.objectiveText, goal === 'Lose Weight' && styles.objectiveTextActive]}>{t('loseWeight')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.objectiveBtn, {backgroundColor: COLORS.surface}, goal === 'Maintain Weight' && styles.objectiveBtnActive]} onPress={() => setGoal('Maintain Weight')}>
          <Text style={[styles.objectiveText, goal === 'Maintain Weight' && styles.objectiveTextActive]}>{t('maintainWeight')}</Text>
        </TouchableOpacity>
      </View>
      <View style={{flexDirection: 'row', gap: 8}}>
        <TouchableOpacity style={[styles.objectiveBtn, {backgroundColor: COLORS.surface}, goal === 'Gain Muscle' && styles.objectiveBtnActive]} onPress={() => setGoal('Gain Muscle')}>
          <Text style={[styles.objectiveText, goal === 'Gain Muscle' && styles.objectiveTextActive]}>{t('gainMuscle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.objectiveBtn, {backgroundColor: COLORS.surface}, goal === 'Gain Weight' && styles.objectiveBtnActive]} onPress={() => setGoal('Gain Weight')}>
          <Text style={[styles.objectiveText, goal === 'Gain Weight' && styles.objectiveTextActive]}>{t('gainWeight')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
           <Text style={styles.label}>{t('age')}</Text>
           <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="25" placeholderTextColor={COLORS.textDim} />
        </View>
        <View style={styles.gridCol}>
           <Text style={styles.label}>{t('height')}</Text>
           <View style={styles.inputWithIcon}>
              <TextInput style={styles.gridInput} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="175" placeholderTextColor={COLORS.textDim} />
           </View>
        </View>
      </View>

      <Text style={styles.label}>{t('gender')}</Text>
      <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
        <TouchableOpacity style={[styles.objectiveBtn, {backgroundColor: COLORS.surface}, gender === 'Male' && styles.objectiveBtnActive]} onPress={() => setGender('Male')}>
          <Text style={[styles.objectiveText, gender === 'Male' && styles.objectiveTextActive]}>{t('male')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.objectiveBtn, {backgroundColor: COLORS.surface}, gender === 'Female' && styles.objectiveBtnActive]} onPress={() => setGender('Female')}>
          <Text style={[styles.objectiveText, gender === 'Female' && styles.objectiveTextActive]}>{t('female')}</Text>
        </TouchableOpacity>
      </View>

       {!editingId && (
          <>
           <Text style={styles.label}>{t('currentWeight')}</Text>
           <TextInput style={styles.input} value={currentWeight} onChangeText={setCurrentWeight} keyboardType="numeric" placeholder={t('currentWeight')} placeholderTextColor={COLORS.textDim} />
          </>
       )}

      <Text style={styles.label}>{t('manualTargetWeight')}</Text>
      <TextInput style={styles.input} value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder={t('autoCalculatePlaceholder')} placeholderTextColor={COLORS.textDim} />

      <Text style={styles.label}>{t('phone')}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+855 99 XXX XXX" placeholderTextColor={COLORS.textDim} />

      <Text style={styles.label}>{t('email')}</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="alex.j@email.com" placeholderTextColor={COLORS.textDim} />
      
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
        <Ionicons name="checkmark" size={20} color="#000" style={{marginRight: 8}}/>
        <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : (editingId ? t('saveEdits') : t('saveClient'))}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 24, paddingBottom: 60 },
  headerAvatar: { alignItems: 'center', marginBottom: 24, paddingTop: 20 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, borderColor: COLORS.primary, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.surfaceLight, padding: 6, borderRadius: 16 },
  label: { color: '#fff', fontSize: 14, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.surface, color: '#fff', padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  inputActive: { borderColor: COLORS.primary },
  objectiveRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 8, padding: 2 },
  objectiveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 6 },
  objectiveBtnActive: { backgroundColor: COLORS.primary },
  objectiveText: { color: COLORS.text, fontSize: 16, fontWeight: '500' },
  objectiveTextActive: { color: '#000', fontWeight: 'bold' },
  gridRow: { flexDirection: 'row', gap: 16 },
  gridCol: { flex: 1 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  gridInput: { flex: 1, color: '#fff', padding: 16, fontSize: 16 },
  saveBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', padding: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  saveBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
