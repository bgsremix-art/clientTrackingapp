import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { uploadImageToFirebase } from '../utils/firebaseStorage';
import { saveImageToGallery } from '../utils/saveImageToGallery';
import { calculateBMR, calculateBMI, getHealthyWeightRange, calculateEstimatedWeeks } from '../utils/bmrEngine';

export default function ClientDetailScreen({ route, navigation }: any) {
   const { clientId } = route.params;
   const { clients, records, attendance, addRecord, editRecord, deleteRecord, deleteClient, editClient, settings, t } = useClients();
   const client = clients.find(c => c.id === clientId);

   const history = records.filter(r => r.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   const latestWeight = history.length > 0 ? history[0] : null;

   const [modalVisible, setModalVisible] = useState(false);
   const [configModalVisible, setConfigModalVisible] = useState(false);
   const [newWeight, setNewWeight] = useState('');
   const [recordPhotoUris, setRecordPhotoUris] = useState<string[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const [activeImage, setActiveImage] = useState<string | null>(null);

   // Config States
   const [localModifier, setLocalModifier] = useState(client?.customCalorieModifier?.toString() || '');
   const [localKG, setLocalKG] = useState('');

   const { user } = useAuth();

   if (!client) return <View style={styles.container}><Text style={styles.emptyText}>Client not found</Text></View>;

   // Initialize KG from modifier on mount or change
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
         const saved = await saveImageToGallery(uri);
         if (!saved) {
            Alert.alert('Permission needed', 'Please allow access to your photos to save images.');
            return;
         }
         Alert.alert(t('success'), t('saveToGallery'));
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
            { text: t('delete'), style: 'destructive', onPress: () => {
               deleteClient(client.id);
               navigation.goBack();
            }}
         ]
      );
   }

   return (
      <ScrollView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={styles.headerTitle}>{t('clientDetailsTitle')}</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
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

         <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.avatarCircle} onPress={() => client.imageUri && setActiveImage(client.imageUri)}>
               {client.imageUri ? <Image source={{ uri: client.imageUri }} style={{ width: 76, height: 76, borderRadius: 38 }} /> : <Ionicons name="person" size={40} color={COLORS.textDim} />}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
               <Text style={styles.clientName}>{client.name}</Text>
               <Text style={styles.clientSub}>{t('goal')}: {client.goal === 'Lose Weight' ? t('loseWeight') : client.goal === 'Maintain Weight' ? t('maintainWeight') : client.goal === 'Gain Muscle' ? t('gainMuscle') : t('gainWeight')}</Text>
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
                   <Text style={styles.attendanceSub}>{attendance.filter(a => a.clientId === client.id && a.attended).length} sessions tracked</Text>
                </View>
             </View>
             <Ionicons name="chevron-forward" size={24} color={COLORS.textDim} />
          </TouchableOpacity>

         <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('progressHistory')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
               <Text style={styles.addRecordText}>{t('addWeight')}</Text>
            </TouchableOpacity>
         </View>

         <View style={styles.historyContainer}>
            {history.length === 0 ? <Text style={styles.emptyText}>{t('noRecords')}</Text> : history.map(h => (
               <TouchableOpacity key={h.id} style={styles.historyRow} onPress={() => navigation.navigate('ProgressRecord', { recordId: h.id })}>
                  <Text style={styles.historyText}>{new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: {h.currentWeightKG} kg</Text>
                  {h.photoUris && h.photoUris.length > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}><Ionicons name="camera" size={16} color={COLORS.primary} /><Text style={{ color: COLORS.primary, fontSize: 12, marginLeft: 4 }}>{h.photoUris.length}</Text></View>}
                  <View style={{ flex: 1 }} />
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textDim} />
               </TouchableOpacity>
            ))}
         </View>

         <View style={styles.mealPlanContainer}>
            <View style={styles.mealHeaderRow}>
               <Text style={styles.sectionTitle}>{t('generateMealPlanSection')}</Text>
               <Ionicons name="toggle" size={36} color={COLORS.primary} />
            </View>
            <View style={styles.iconsRow}>
               <View style={styles.iconItem}><Text style={styles.emoji}>🥩</Text><Text style={styles.iconLabel}>{t('meat')}</Text></View>
               <View style={styles.iconItem}><Text style={styles.emoji}>🥦</Text><Text style={styles.iconLabel}>{t('vegetables')}</Text></View>
               <View style={styles.iconItem}><Text style={styles.emoji}>🍎</Text><Text style={styles.iconLabel}>{t('fruitsLabel')}</Text></View>
               <View style={styles.iconItem}><Text style={styles.emoji}>🍞</Text><Text style={styles.iconLabel}>{t('carbsLabel')}</Text></View>
            </View>
            <TouchableOpacity style={styles.generateBtn} onPress={() => navigation.navigate('GenerateMealPlan', { clientId: client.id })}>
               <Text style={styles.generateBtnText}>{t('generateMealPlanBtn')}</Text>
            </TouchableOpacity>
         </View>

         <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" style={{marginRight: 8}}/>
            <Text style={styles.deleteBtnText}>{t('deleteClient')}</Text>
         </TouchableOpacity>

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
                     <TouchableOpacity onPress={handleSaveWeight} style={[styles.modalSaveBtn, isSaving && {opacity: 0.5}]} disabled={isSaving}>
                        <Text style={{ color: '#000', fontWeight: 'bold' }}>{isSaving ? 'Saving...' : t('save')}</Text>
                     </TouchableOpacity>
                  </View>
               </View>
            </KeyboardAvoidingView>
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

      </ScrollView>
   )
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },
   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
   headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
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
   attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, marginHorizontal: 16, padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
   attendanceInfo: { flexDirection: 'row', alignItems: 'center' },
   attendanceLabel: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
   attendanceSub: { color: COLORS.textDim, fontSize: 12 },
   modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
   configGroup: { marginBottom: 24 },
   configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
   configLabel: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
   configInput: { backgroundColor: COLORS.background, color: COLORS.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, width: 80, textAlign: 'center' },
   configSaveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center' },
   configSaveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
   warningText: { color: '#ff9800', fontSize: 12, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }
});
