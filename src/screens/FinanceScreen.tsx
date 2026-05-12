import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../context/ClientContext';
import { COLORS } from '../constants/theme';
import { PaymentRecord } from '../models/types';

const FinanceScreen = () => {
   const { payments, clients, t, settings, addPayment, deletePayment } = useClients();
   const [viewDate, setViewDate] = useState(new Date());

   // Edit State
   const [editModalVisible, setEditModalVisible] = useState(false);
   const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
   const [editAmount, setEditAmount] = useState('');
   const [editDate, setEditDate] = useState('');

   const monthKey = viewDate.toLocaleDateString(settings.language === 'km' ? 'km-KH' : 'en-US', { month: 'long', year: 'numeric' });

   const filteredPayments = useMemo(() => {
      return payments.filter(p => {
         const pDate = new Date(p.date);
         return pDate.getMonth() === viewDate.getMonth() && pDate.getFullYear() === viewDate.getFullYear();
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }, [payments, viewDate]);

   const totalRevenue = useMemo(() => {
      return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
   }, [filteredPayments]);

   const changeMonth = (offset: number) => {
      const next = new Date(viewDate);
      next.setMonth(next.getMonth() + offset);
      setViewDate(next);
   };

   const handleDelete = (id: string) => {
      Alert.alert(
         t('delete') || 'Delete',
         t('confirmDeletePayment'),
         [
            { text: t('cancel'), style: 'cancel' },
            { text: t('delete'), style: 'destructive', onPress: () => deletePayment(id) }
         ]
      );
   };

   const openEditModal = (p: PaymentRecord) => {
      setEditingPayment(p);
      setEditAmount(p.amount.toString());
      setEditDate(p.date.split('T')[0]);
      setEditModalVisible(true);
   };

   const handleSaveEdit = () => {
      if (!editingPayment || !editAmount) return;
      const amount = parseFloat(editAmount);
      if (isNaN(amount)) return;

      const updated: PaymentRecord = {
         ...editingPayment,
         amount,
         date: new Date(editDate).toISOString()
      };

      addPayment(updated);
      setEditModalVisible(false);
      setEditingPayment(null);
   };

   const renderPaymentItem = ({ item }: { item: PaymentRecord }) => {
      const client = clients.find(c => c.id === item.clientId);
      return (
         <View style={styles.paymentCard}>
            <View style={styles.paymentInfo}>
               <Text style={styles.clientName}>{client?.name || t('unknownClient')}</Text>
               <Text style={styles.paymentDate}>{new Date(item.date).toLocaleDateString(settings.language === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
            <View style={styles.rightSide}>
               <View style={styles.amountContainer}>
                  <Text style={styles.currency}>$</Text>
                  <Text style={styles.amount}>{item.amount.toLocaleString()}</Text>
               </View>
               <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                     <Ionicons name="pencil" size={18} color={COLORS.textDim} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                     <Ionicons name="trash-outline" size={18} color="#ff4444" />
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      );
   };

   return (
      <SafeAreaView style={styles.container}>
         <View style={styles.header}>
            <Text style={styles.title}>{t('financeTitle')}</Text>
         </View>

         <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
               <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthKey}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
               <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
            </TouchableOpacity>
         </View>

         <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('totalRevenue')}</Text>
            <Text style={styles.summaryAmount}>${totalRevenue.toLocaleString()}</Text>
            <View style={styles.countBadge}>
               <Text style={styles.countText}>{filteredPayments.length} {filteredPayments.length === 1 ? (t('sessions') || 'Payment') : (t('sessions') || 'Payments')}</Text>
            </View>
         </View>

         <FlatList
            data={filteredPayments}
            keyExtractor={item => item.id}
            renderItem={renderPaymentItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
               <View style={styles.emptyState}>
                  <Ionicons name="cash-outline" size={64} color={COLORS.textDim} />
                  <Text style={styles.emptyText}>{t('noRecords')}</Text>
               </View>
            }
         />

         {/* Edit Modal */}
         <Modal visible={editModalVisible} transparent animationType="slide">
            <View style={styles.modalBg}>
               <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalCard}>
                  <View style={styles.modalHeaderRow}>
                     <Text style={styles.modalTitle}>{t('editPayment')}</Text>
                     <TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDim} /></TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>{t('amount')}</Text>
                     <View style={styles.amountInputWrap}>
                        <Text style={styles.amountPrefix}>$</Text>
                        <TextInput 
                           style={styles.input}
                           keyboardType="numeric"
                           value={editAmount}
                           onChangeText={setEditAmount}
                        />
                     </View>
                  </View>

                  <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>{t('paymentDate')}</Text>
                     <View style={styles.amountInputWrap}>
                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                        <TextInput 
                           style={styles.input}
                           placeholder="YYYY-MM-DD"
                           value={editDate}
                           onChangeText={setEditDate}
                        />
                     </View>
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                     <Text style={styles.saveBtnText}>{t('save')}</Text>
                  </TouchableOpacity>
               </KeyboardAvoidingView>
            </View>
         </Modal>
      </SafeAreaView>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },
   header: { padding: 20, paddingTop: Platform.OS === 'android' ? 60 : 10 },
   title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
   monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
   monthBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 12 },
   monthLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
   summaryCard: { margin: 20, marginTop: 0, padding: 24, backgroundColor: COLORS.primary, borderRadius: 24, alignItems: 'center', elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
   summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 8 },
   summaryAmount: { color: '#fff', fontSize: 42, fontWeight: '900' },
   countBadge: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
   countText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
   listContent: { padding: 20, paddingBottom: 100 },
   paymentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
   paymentInfo: { flex: 1 },
   clientName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
   paymentDate: { color: COLORS.textDim, fontSize: 12 },
   rightSide: { alignItems: 'flex-end' },
   amountContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
   currency: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold', marginTop: 2, marginRight: 2 },
   amount: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
   itemActions: { flexDirection: 'row', gap: 12 },
   iconBtn: { padding: 4 },
   emptyState: { alignItems: 'center', marginTop: 100 },
   emptyText: { color: COLORS.textDim, fontSize: 16, marginTop: 16 },

   // Modal
   modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
   modalCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border },
   modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
   modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
   inputGroup: { marginBottom: 20 },
   inputLabel: { color: COLORS.textDim, fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
   amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border },
   amountPrefix: { color: COLORS.primary, fontWeight: 'bold', fontSize: 18, marginRight: 8 },
   input: { flex: 1, color: COLORS.text, paddingVertical: 14, fontSize: 16 },
   saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
   saveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});

export default FinanceScreen;
