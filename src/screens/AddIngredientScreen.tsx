import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { FoodLibraryItem } from '../models/types';
import * as ImagePicker from 'expo-image-picker';

export default function AddIngredientScreen({ navigation, route }: any) {
  const { ingredients, addIngredient, editIngredient, t } = useClients();
  const editingId = route?.params?.ingredientId;
  const existing = ingredients.find(i => i.id === editingId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('Protein');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [cals, setCals] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
     if (existing) {
         setName(existing.name);
         setCategory(existing.category);
         setProtein(existing.proteinBase.toString());
         setCarbs(existing.carbBase.toString());
         setFats(existing.fatBase.toString());
         setCals(existing.calsBase.toString());
         setNotes(existing.notes || '');
         if (existing.imageUri) setImageUri(existing.imageUri);
     }
  }, [existing]);

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

  const handleSave = () => {
    if (!name) return;
    const data: any = {
      id: editingId || Date.now().toString(),
      name,
      category,
      proteinBase: parseFloat(protein) || 0,
      carbBase: parseFloat(carbs) || 0,
      fatBase: parseFloat(fats) || 0,
      calsBase: parseFloat(cals) || 0,
      notes,
      icon: category === 'Protein' ? '🍗' : category === 'Carbs' ? '🍚' : category === 'Fruits' ? '🍎' : '🥦',
      imageUri: imageUri || null,
    };

    // Remove any undefined values to prevent Firestore crashes
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    if (editingId) editIngredient(data);
    else addIngredient(data);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
           <Ionicons name="chevron-back" size={24} color={COLORS.text} onPress={() => navigation.goBack()}/>
           <Text style={styles.headerTitle}>{editingId ? t('editIngredientTitle') : t('addIngredientTitle')}</Text>
           <TouchableOpacity onPress={() => navigation.goBack()}>
             <Text style={{color: COLORS.textDim}}>{t('cancel')}</Text>
           </TouchableOpacity>
        </View>

        <View style={styles.headerAvatar}>
          <TouchableOpacity style={styles.avatarCircle} onPress={pickImage}>
            {imageUri ? <Image source={{uri: imageUri}} style={styles.avatarImg} /> : <Ionicons name="camera" size={54} color={COLORS.textDim} />}
            <View style={styles.cameraIcon}>
              <Ionicons name="add" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('ingredientName')}</Text>
        <TextInput style={[styles.input, styles.inputActive]} placeholder="e.g., Turkey Breast" placeholderTextColor={COLORS.textDim} value={name} onChangeText={setName} />

        <Text style={styles.label}>{t('category')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{gap: 8}}>
           {['Protein', 'Carbs', 'Veggies', 'Fruits'].map(cat => {
              const mappedCat = cat === 'Protein' ? t('protein') : cat === 'Carbs' ? t('carbs') : cat === 'Veggies' ? t('veggies') : t('fruits');
              return (
                <TouchableOpacity key={cat} onPress={() => setCategory(cat as any)} style={[styles.tabBtn, category === cat && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, category === cat && styles.tabTextActive]}>{mappedCat}</Text>
                </TouchableOpacity>
              );
           })}
        </ScrollView>

        <Text style={styles.label}>{t('nutritionLabel')}</Text>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.subLabel}>{t('protein')} (g)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="22" placeholderTextColor={COLORS.textDim} value={protein} onChangeText={setProtein}/>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.subLabel}>{t('carbs')} (g)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textDim} value={carbs} onChangeText={setCarbs}/>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.subLabel}>{t('fats')} (g)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="1" placeholderTextColor={COLORS.textDim} value={fats} onChangeText={setFats}/>
          </View>
        </View>

        <Text style={styles.label}>{t('caloriesKcal')}</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="97" placeholderTextColor={COLORS.textDim} value={cals} onChangeText={setCals}/>

        <Text style={styles.label}>{t('descriptionNotes')}</Text>
        <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} multiline placeholder="e.g., Lean, high-quality protein." placeholderTextColor={COLORS.textDim} value={notes} onChangeText={setNotes}/>

        <TouchableOpacity style={styles.addBtn} onPress={handleSave}>
           <Text style={styles.addBtnText}>{editingId ? t('saveChanges') : t('addToLibrary')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 60, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  headerAvatar: { alignItems: 'center', marginBottom: 16, paddingTop: 10 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, borderColor: COLORS.primary, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.surfaceLight, padding: 6, borderRadius: 16 },
  label: { color: COLORS.text, fontSize: 14, marginTop: 16, marginBottom: 8 },
  subLabel: { color: COLORS.text, fontSize: 12, marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, color: COLORS.text, padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  inputActive: { borderColor: COLORS.primary },
  tabScroll: { maxHeight: 50 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.surface },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontSize: 14 },
  tabTextActive: { color: '#000', fontWeight: 'bold' },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCol: { flex: 1 },
  addBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  addBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
