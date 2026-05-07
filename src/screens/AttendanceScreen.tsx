import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { LocaleConfig } from 'react-native-calendars';

// Configure Khmer Locale
LocaleConfig.locales['km'] = {
  monthNames: ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'],
  monthNamesShort: ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ិកា', 'ធ្នូ'],
  dayNames: ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'],
  dayNamesShort: ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'],
  today: 'ថ្ងៃនេះ'
};
// English remains default but can be explicit
LocaleConfig.locales['en'] = LocaleConfig.locales[''];

export default function AttendanceScreen({ route, navigation }: any) {
  const { clientId } = route.params;
  const { clients, attendance, toggleAttendance, deleteAttendance, settings, t } = useClients();
  const client = clients.find(c => c.id === clientId);

  // Set Locale based on settings
  LocaleConfig.defaultLocale = settings.language === 'km' ? 'km' : 'en';

  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  if (!client) return null;

  const clientAttendance = attendance
    .filter(a => a.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const markedDates: any = {};
  clientAttendance.forEach(a => {
    markedDates[a.date] = {
      selected: true,
      selectedColor: a.attended ? COLORS.primary : '#ff4444',
      marked: !!a.notes,
      dotColor: '#fff'
    };
  });

  const handleDayPress = (day: any) => {
    const existing = attendance.find(a => a.clientId === clientId && a.date === day.dateString);
    setSelectedDay(day);
    setNote(existing?.notes || '');
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('attendanceTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.profileSummary}>
          <View style={styles.avatarCircle}>
            {client.imageUri ? (
              <Image source={{ uri: client.imageUri }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={30} color={COLORS.textDim} />
            )}
          </View>
          <View>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.sessionCount}>
              {clientAttendance.filter(a => a.attended).length} {t('sessions')}
            </Text>
          </View>
        </View>

        <View style={styles.calendarWrapper}>
          <Calendar
            theme={{
              backgroundColor: COLORS.surface,
              calendarBackground: COLORS.surface,
              textSectionTitleColor: COLORS.textDim,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: '#000',
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.text,
              textDisabledColor: COLORS.textDim,
              dotColor: COLORS.primary,
              monthTextColor: COLORS.text,
              indicatorColor: COLORS.primary,
              arrowColor: COLORS.primary,
            }}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            onMonthChange={(month: any) => setCurrentMonth(month.dateString.substring(0, 7))}
          />
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>{t('markAttended')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#ff4444' }]} />
            <Text style={styles.legendText}>{t('absentWithNote')}</Text>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('attendanceTab')} {t('progressHistory')}</Text>
          {clientAttendance.filter(a => a.date.startsWith(currentMonth)).length === 0 ? (
            <Text style={styles.emptyText}>No records for this month.</Text>
          ) : (
            clientAttendance.filter(a => a.date.startsWith(currentMonth)).map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.historyCard}
                onPress={() => {
                  setSelectedDay({ dateString: item.date });
                  setNote(item.notes || '');
                  setModalVisible(true);
                }}
              >
                <View style={[styles.statusIndicator, { backgroundColor: item.attended ? COLORS.primary : '#ff4444' }]} />
                <View style={styles.historyDetails}>
                   <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString(settings.language === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                      <Text style={[styles.statusText, { color: item.attended ? COLORS.primary : '#ff4444' }]}>
                         {item.attended ? t('markAttended') : t('markAbsent')}
                      </Text>
                   </View>
                   {item.notes ? (
                      <Text style={styles.historyNote}>{item.notes}</Text>
                   ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedDay?.dateString}</Text>
            
            <TextInput
              style={styles.noteInput}
              placeholder={t('addNotePlaceholder')}
              placeholderTextColor={COLORS.textDim}
              value={note}
              onChangeText={setNote}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} 
                onPress={() => {
                  toggleAttendance(clientId, selectedDay.dateString, note, true); 
                  setModalVisible(false);
                }}
              >
                <Text style={styles.actionBtnText}>{t('markAttended')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#ff4444' }]} 
                onPress={() => {
                  toggleAttendance(clientId, selectedDay.dateString, note, false); 
                  setModalVisible(false);
                }}
              >
                <Text style={styles.actionBtnText}>{t('markAbsent')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => {
                deleteAttendance(`${clientId}_${selectedDay.dateString}`);
                setModalVisible(false);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
              <Text style={styles.deleteBtnText}>{t('clearRecord')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 1,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImg: { width: 50, height: 50 },
  clientName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  sessionCount: { color: COLORS.primary, fontSize: 14 },
  calendarWrapper: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legend: { padding: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { color: COLORS.text, fontSize: 14 },
  hintText: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  noteInput: { backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 12, padding: 16, fontSize: 16, height: 100, textAlignVertical: 'top', marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  closeBtn: { padding: 12, alignItems: 'center' },
  closeBtnText: { color: COLORS.textDim, fontWeight: 'bold' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginBottom: 8 },
  deleteBtnText: { color: '#ff4444', fontWeight: 'bold', marginLeft: 8 },
  historySection: { padding: 16, marginTop: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  historyCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  statusIndicator: { width: 6 },
  historyDetails: { flex: 1, padding: 16 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  historyNote: { color: COLORS.textDim, fontSize: 14, fontStyle: 'italic' },
  emptyText: { color: COLORS.textDim, fontSize: 14, textAlign: 'center', marginTop: 16 }
});
