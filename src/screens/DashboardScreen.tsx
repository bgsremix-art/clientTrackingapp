import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useClients } from '../context/ClientContext';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export type RootStackParamList = {
  Dashboard: undefined;
  AddClient: { clientId?: string };
  ClientDetails: { clientId: string };
  GenerateMealPlan: { clientId: string };
  ProgressRecord: { recordId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ navigation }: any) {
  const { clients, t } = useClients();
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('dashboardTitle')}</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textDim} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchClients')}
          placeholderTextColor={COLORS.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredClients}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => navigation.navigate('ClientDetails', { clientId: item.id })}
          >
            <View style={styles.avatarContainer}>
              {item.imageUri ? <Image source={{uri: item.imageUri}} style={{width: 60, height: 60, borderRadius: 30}} /> : <Ionicons name="person-circle" size={56} color={COLORS.textDim} />}
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardSub}>{t('goal')}: {item.goal === 'Lose Weight' ? t('loseWeight') : item.goal === 'Maintain Weight' ? t('maintainWeight') : item.goal === 'Gain Muscle' ? t('gainMuscle') : t('gainWeight')}</Text>
              <Text style={styles.cardSub}>{t('lastSync')}: {t('justNow')}</Text>
              <View style={styles.badges}>
                  <Ionicons name="bar-chart" size={16} color={COLORS.primary} style={{marginRight: 10}}/>
                  <Ionicons name="fitness" size={16} color={COLORS.primary} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noClients')}</Text>}
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AddClient', {})}
      >
        <Ionicons name="add" size={32} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 24, marginTop: 70, marginBottom: 16 },
  headerTitle: { color: COLORS.text, fontSize: 36, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, marginHorizontal: 24, marginBottom: 16, borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { color: COLORS.text, padding: 12, flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderColor: COLORS.border, borderWidth: 1 },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, borderColor: COLORS.primary, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { color: COLORS.textDim, fontSize: 14, marginBottom: 2 },
  badges: { flexDirection: 'row', marginTop: 8 },
  emptyText: { color: COLORS.textDim, fontSize: 16, textAlign: 'center', marginTop: 32 },
  fab: { position: 'absolute', bottom: 32, right: 32, backgroundColor: COLORS.primary, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
