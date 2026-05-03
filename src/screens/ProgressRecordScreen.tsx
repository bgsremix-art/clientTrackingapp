import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { calculateBMR, calculateBMI } from '../utils/bmrEngine';

export default function ProgressRecordScreen({ route, navigation }: any) {
    const { recordId } = route.params;
    const { records, clients, editRecord, deleteRecord, t } = useClients();

    const record = records.find(r => r.id === recordId);
    const client = record ? clients.find((c: any) => c.id === record.clientId) : null;

    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editDate, setEditDate] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editNotes, setEditNotes] = useState('');

    if (!record) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>Error</Text>
                    <View style={{ width: 24 }} />
                </View>
                <Text style={{ color: COLORS.text, textAlign: 'center', marginTop: 50 }}>Record not found</Text>
            </View>
        )
    }

    const handleAddPhotos = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.5 });
        if (!result.canceled) {
            const uris = result.assets.map(a => a.uri);
            editRecord({ ...record, photoUris: [...(record.photoUris || []), ...uris] });
        }
    };

    const handleDeletePhoto = (index: number) => {
        Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    const updatedUris = [...(record.photoUris || [])];
                    updatedUris.splice(index, 1);
                    editRecord({ ...record, photoUris: updatedUris.length > 0 ? updatedUris : undefined });
                }
            }
        ]);
    };

    const handleDelete = () => {
        Alert.alert('Delete Record', 'Are you sure you want to delete this entire progress record?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    deleteRecord(record.id);
                    navigation.goBack();
                }
            }
        ]);
    };

    const openEditModal = () => {
        setEditDate(record.date.substring(0, 10));
        setEditWeight(record.currentWeightKG.toString());
        setEditNotes(record.notes || '');
        setEditModalVisible(true);
    };

    const handleEditSave = () => {
        const w = parseFloat(editWeight);
        if (!w) return;
        const height = client ? client.heightCM : 170;
        let newDateIso = record.date;
        if (editDate && editDate.length === 10) {
            try { newDateIso = new Date(editDate).toISOString(); } catch (e) { }
        }
        editRecord({ ...record, currentWeightKG: w, notes: editNotes, bmi: calculateBMI(w, height), date: newDateIso });
        setEditModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{t('progressRecordTitle')}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={openEditModal}>
                        <Ionicons name="pencil" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete}>
                        <Ionicons name="trash" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View style={styles.card}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>{new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>

                    <Text style={styles.label}>{t('weight')}</Text>
                    <Text style={styles.value}>{record.currentWeightKG} kg</Text>

                    <Text style={styles.label}>BMI</Text>
                    <Text style={styles.value}>{record.bmi || calculateBMI(record.currentWeightKG, client ? client.heightCM : 170)}</Text>

                    {record.notes ? (
                        <>
                            <Text style={styles.label}>{t('notes')}</Text>
                            <Text style={styles.value}>{record.notes}</Text>
                        </>
                    ) : null}
                </View>

                <View style={styles.photoHeader}>
                    <Text style={styles.sectionTitle}>Photos ({record.photoUris?.length || 0})</Text>
                    <TouchableOpacity onPress={handleAddPhotos} style={styles.addBtn}>
                        <Text style={styles.addBtnText}>+ Add</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.photoGrid}>
                    {record.photoUris && record.photoUris.map((uri, idx) => (
                        <TouchableOpacity key={idx} onPress={() => setFullScreenImage(uri)} style={styles.photoWrapper}>
                            <Image source={{ uri }} style={styles.gridImage} />
                            <TouchableOpacity
                                style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}
                                onPress={() => handleDeletePhoto(idx)}
                            >
                                <Ionicons name="trash" size={16} color={COLORS.error} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                    {(!record.photoUris || record.photoUris.length === 0) && (
                        <Text style={{ color: COLORS.textDim }}>No photos uploaded for this record.</Text>
                    )}
                </View>
            </ScrollView>

            <Modal visible={!!fullScreenImage} transparent animationType="fade">
                <View style={styles.fullScreenBg}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setFullScreenImage(null)}>
                        <Ionicons name="close" size={32} color="#fff" />
                    </TouchableOpacity>
                    {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} resizeMode="contain" />}
                </View>
            </Modal>

            <Modal visible={editModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Edit Record</Text>

                        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                        <TextInput style={styles.input} value={editDate} onChangeText={setEditDate} placeholder="2024-10-01" placeholderTextColor={COLORS.textDim} />

                        <Text style={styles.label}>{t('weight')} (kg)</Text>
                        <TextInput style={styles.input} value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" />

                        <Text style={styles.label}>{t('notes')}</Text>
                        <TextInput style={styles.input} value={editNotes} onChangeText={setEditNotes} multiline />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>{t('close')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleEditSave}>
                                <Text style={styles.saveBtnText}>{t('saveEdits')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
    card: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 12, borderColor: COLORS.border, borderWidth: 1, marginBottom: 32 },
    label: { color: COLORS.textDim, fontSize: 14, marginBottom: 4 },
    value: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
    addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    addBtnText: { color: '#000', fontWeight: 'bold' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    photoWrapper: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
    gridImage: { width: '100%', height: '100%' },
    fullScreenBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    input: { backgroundColor: COLORS.surfaceLight, color: COLORS.text, padding: 16, borderRadius: 12, marginBottom: 12 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 16 },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
    cancelBtnText: { color: COLORS.textDim, fontWeight: 'bold' },
    saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, justifyContent: 'center' },
    saveBtnText: { color: '#000', fontWeight: 'bold' }
});
