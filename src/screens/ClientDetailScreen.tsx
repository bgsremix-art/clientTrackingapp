import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { uploadImageToFirebase } from '../utils/firebaseStorage';
import { calculateBMR, calculateBMI, getHealthyWeightRange, calculateEstimatedWeeks } from '../utils/bmrEngine';

export default function ClientDetailScreen({ route, navigation }: any) {
   const { clientId } = route.params;
   const { clients, records, addRecord, editRecord, deleteRecord, deleteClient, settings, t } = useClients();
   const client = clients.find(c => c.id === clientId);

   const history = records.filter(r => r.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   const latestWeight = history.length > 0 ? history[0] : null;

   const [modalVisible, setModalVisible] = useState(false);
   const [newWeight, setNewWeight] = useState('');
   const [recordPhotoUris, setRecordPhotoUris] = useState<string[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const { user } = useAuth();

   if (!client) return <View style={styles.container}><Text style={styles.emptyText}>Client not found</Text></View>;

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

   const calorieDelta = client.goal === 'Gain Weight' ? settings.gainWeightCals : client.goal === 'Gain Muscle' ? settings.gainMuscleCals : client.goal === 'Lose Weight' ? settings.loseWeightCals : 0;
   const estimatedWeeks = latestWeight ? calculateEstimatedWeeks(latestWeight.currentWeightKG, targetW, calorieDelta) : 'N/A';

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
            <TouchableOpacity onPress={() => navigation.navigate('AddClient', { clientId: client.id })}>
               <Ionicons name="pencil" size={24} color={COLORS.text} />
            </TouchableOpacity>
         </View>

         <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
               {client.imageUri ? <Image source={{ uri: client.imageUri }} style={{ width: 76, height: 76, borderRadius: 38 }} /> : <Ionicons name="person" size={40} color={COLORS.textDim} />}
            </View>
            <View style={styles.profileInfo}>
               <Text style={styles.clientName}>{client.name}</Text>
               <Text style={styles.clientSub}>{t('goal')}: {client.goal === 'Lose Weight' ? t('loseWeight') : client.goal === 'Maintain Weight' ? t('maintainWeight') : client.goal === 'Gain Muscle' ? t('gainMuscle') : t('gainWeight')}</Text>
               <Text style={styles.clientSub}>{t('age')}: {client.age} | {client.gender === 'Male' ? t('male') : t('female')}</Text>
               <Text style={styles.clientSub}>{t('height')}: {client.heightCM} cm</Text>
            </View>
         </View>

         <View style={styles.statsCard}>
            <Text style={styles.statsText}>{t('latestWeight')}: {latestWeight ? latestWeight.currentWeightKG + ' kg' : 'N/A'}</Text>
            <Text style={styles.statsText}>BMI: {latestWeight ? (latestWeight.bmi || calculateBMI(latestWeight.currentWeightKG, client.heightCM)) : 'N/A'}</Text>
            <Text style={styles.statsText}>{t('targetWeight')}: {targetW} kg</Text>
            <Text style={styles.statsText}>{t('standardWeight')}: {min} - {max} kg</Text>
            <Text style={styles.statsText}>{t('estimatedTime')}: <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{estimatedWeeks} {t('weeks')}</Text></Text>
         </View>

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
   modalSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }
});
