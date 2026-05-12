import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, TextInput } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';

export default function IngredientsLibraryScreen({ navigation, route }: any) {
  const { ingredients, deleteIngredient, t } = useClients();
  const showBack = route?.params?.showBack;
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const tabs = ['All', 'Protein', 'Carbs', 'Veggies', 'Fruits'];

  const getFilteredData = () => {
     let data = ingredients;
     if (activeTab !== 'All') {
         data = data.filter(d => d.category === activeTab);
     }
     if (searchQuery) {
         data = data.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
     }
     return data;
  }

  const handleDelete = (id: string) => deleteIngredient(id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         {showBack ? (
           <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
             <Ionicons name="chevron-back" size={24} color={COLORS.text} />
           </TouchableOpacity>
         ) : (
           <View style={styles.headerIconBtn} />
         )}
         <Text style={styles.headerTitle}>{t('ingredientsLibrary')}</Text>
         <TouchableOpacity style={styles.headerAddBtn} onPress={() => navigation.navigate('AddIngredient', {})}>
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={{color: COLORS.primary, fontSize: 10}}>{t('addNew')}</Text>
         </TouchableOpacity>
      </View>

      <TextInput 
        style={styles.searchInput}
        placeholder={t('searchIngredients')}
        placeholderTextColor={COLORS.textDim}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{gap: 12, paddingHorizontal: 16}}>
         {tabs.map(tab => {
            const mappedTab = tab === 'All' ? t('all') : tab === 'Protein' ? t('protein') : tab === 'Carbs' ? t('carbs') : tab === 'Veggies' ? t('veggies') : t('fruits');
            return (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{mappedTab}</Text>
              </TouchableOpacity>
            );
         })}
      </ScrollView>

      <FlatList
         data={getFilteredData()}
         keyExtractor={item => item.id}
         contentContainerStyle={styles.listContainer}
         renderItem={({item}) => (
           <View style={styles.card}>
              {item.imageUri ? <Image source={{uri: item.imageUri}} style={{width: 32, height: 32, borderRadius: 16, marginRight: 14}}/> : <Text style={styles.icon}>{item.icon || '🍽️'}</Text>}
              <View style={styles.cardContent}>
                 <Text style={styles.cardName}>{item.name}</Text>
                 <Text style={styles.macros}>P: {item.proteinBase}g | C: {item.carbBase}g | F: {item.fatBase}g | {item.calsBase} kcal</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('AddIngredient', { ingredientId: item.id })}>
                 <Ionicons name="pencil" size={20} color={COLORS.textDim} style={{paddingRight: 16}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                 <Ionicons name="trash" size={20} color={COLORS.error} />
              </TouchableOpacity>
           </View>
         )}
         ListEmptyComponent={<Text style={{color: COLORS.textDim, textAlign: 'center', marginTop: 40}}>No ingredients in this category.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
  headerIconBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  headerAddBtn: { alignItems: 'center' },
  searchInput: { 
    backgroundColor: COLORS.surfaceLight, 
    color: COLORS.text, 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    marginHorizontal: 16, 
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 22
  },
  tabScroll: { height: 60, flexGrow: 0, marginVertical: 8 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, justifyContent: 'center', height: 44 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontSize: 15, fontWeight: 'bold', lineHeight: 24 },
  tabTextActive: { color: '#000' },
  listContainer: { padding: 16, paddingBottom: 60 },
  card: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  icon: { fontSize: 24, marginRight: 14 },
  cardContent: { flex: 1 },
  cardName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  macros: { color: COLORS.textDim, fontSize: 13 }
});
