import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { COLORS } from '../constants/theme';
import { auth } from '../config/firebase';
import { useClients } from '../context/ClientContext';
import { UserProfile } from '../models/types';
import { getAccessStatus, TRIAL_DAYS } from '../utils/accessStatus';
import { AdminUserFilter } from './AdminScreen';

const formatDate = (value?: string) => {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDisplayEmail = (profile: UserProfile) => profile.email || 'Email not saved yet';

const getUserAccessLabel = (profile: UserProfile) => {
  if (profile.blocked) return { label: 'Blocked', color: COLORS.error };
  const status = getAccessStatus({
    loseWeightCals: -500,
    gainMuscleCals: 300,
    gainWeightCals: 500,
    language: 'en',
    trialStartedAt: profile.trialStartedAt,
    subscriptionExpiry: profile.subscriptionExpiry || undefined,
  });

  if (!status.active) return { label: 'Expired', color: '#ff9800' };
  if (status.type === 'subscription') return { label: `Paid ${status.days}d`, color: COLORS.primary };
  return { label: `Trial ${status.days}d`, color: '#4CAF50' };
};

export default function AdminUsersScreen({ route, navigation }: any) {
  const filter = (route.params?.filter || 'all') as AdminUserFilter;
  const title = route.params?.title || 'Users';
  const {
    isAdmin,
    adminUsers,
    refreshAdminUsers,
    updateUserProfile,
    updateUserSubscription,
    deleteUserData,
  } = useClients();

  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return adminUsers.filter((profile) => {
      if (term && !profile.email.toLowerCase().includes(term)) return false;

      const activeAt = new Date(profile.lastActiveAt).getTime();
      const access = getUserAccessLabel(profile).label;

      if (filter === 'today') return Number.isFinite(activeAt) && now - activeAt <= day;
      if (filter === 'week') return Number.isFinite(activeAt) && now - activeAt <= day * 7;
      if (filter === 'paid') return access.startsWith('Paid');
      if (filter === 'trial') return access.startsWith('Trial');
      if (filter === 'expired') return access === 'Expired';
      return true;
    });
  }, [adminUsers, query, filter]);

  const runAdminAction = async (action: () => Promise<void>, successMessage: string) => {
    setSaving(true);
    try {
      await action();
      Alert.alert('Success', successMessage);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Admin action failed.');
    } finally {
      setSaving(false);
    }
  };

  const extendSubscription = (profile: UserProfile, months: number) => {
    const currentExpiry = profile.subscriptionExpiry ? new Date(profile.subscriptionExpiry) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const nextExpiry = new Date(baseDate);
    nextExpiry.setMonth(nextExpiry.getMonth() + months);
    runAdminAction(
      () => updateUserSubscription(profile.uid, nextExpiry.toISOString(), profile.trialStartedAt),
      `Subscription extended for ${getDisplayEmail(profile)}.`
    );
  };

  const resetTrial = (profile: UserProfile) => {
    runAdminAction(
      () => updateUserSubscription(profile.uid, '', new Date().toISOString()),
      `Trial reset for ${getDisplayEmail(profile)}.`
    );
  };

  const expireUser = (profile: UserProfile) => {
    const expiredTrialStart = new Date(Date.now() - (TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    runAdminAction(
      () => updateUserSubscription(profile.uid, '', expiredTrialStart),
      `${getDisplayEmail(profile)} is now expired.`
    );
  };

  const confirmDeleteData = (profile: UserProfile) => {
    Alert.alert('Delete user data', `Delete clients, records, attendance, and ingredients for ${getDisplayEmail(profile)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete data',
        style: 'destructive',
        onPress: () => runAdminAction(() => deleteUserData(profile.uid), 'User data deleted.'),
      },
    ]);
  };

  const sendResetPassword = (profile: UserProfile) => {
    if (!profile.email) {
      Alert.alert('Missing email', 'This user email is not saved yet. Ask the user to log in once, then try again.');
      return;
    }

    runAdminAction(
      () => sendPasswordResetEmail(auth, profile.email),
      `Password reset email sent to ${getDisplayEmail(profile)}.`
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={64} color={COLORS.textDim} />
        <Text style={styles.centerTitle}>Admin access required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>{filteredUsers.length} users</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={refreshAdminUsers}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {saving && (
          <View style={styles.savingBar}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.savingText}>Saving admin change...</Text>
          </View>
        )}

        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search email"
          placeholderTextColor={COLORS.textDim}
          autoCapitalize="none"
        />

        {filteredUsers.map((profile) => {
          const access = getUserAccessLabel(profile);
          return (
            <TouchableOpacity key={profile.uid} style={styles.userCard} onPress={() => setSelectedUser(profile)} activeOpacity={0.85}>
              <View style={styles.userTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userEmail} numberOfLines={1}>{getDisplayEmail(profile)}</Text>
                  <Text style={styles.userMeta}>Last active: {formatDate(profile.lastActiveAt)} | {profile.platform}</Text>
                  <Text style={styles.userMeta}>Trial: {formatDate(profile.trialStartedAt)} | Sub: {formatDate(profile.subscriptionExpiry)}</Text>
                  <Text style={styles.userMeta}>Clients: {profile.clientCount || 0} | Records: {profile.recordCount || 0} | Attendance: {profile.attendanceCount || 0}</Text>
                </View>
                <View style={[styles.badge, { borderColor: access.color }]}>
                  <Text style={[styles.badgeText, { color: access.color }]}>{access.label}</Text>
                </View>
              </View>

              <View style={styles.manageRow}>
                <Text style={styles.tapHint}>Tap user box to manage</Text>
                <View style={styles.manageBtn}>
                  <Text style={styles.manageBtnText}>Manage</Text>
                  <Ionicons name="chevron-forward" size={16} color="#000" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredUsers.length === 0 && (
          <Text style={styles.emptyText}>No users found.</Text>
        )}
      </ScrollView>

      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{getDisplayEmail(selectedUser)}</Text>
                    <Text style={styles.userMeta}>Clients: {selectedUser.clientCount || 0} | Records: {selectedUser.recordCount || 0}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedUser(null)}>
                    <Ionicons name="close" size={26} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.actions}>
                  <AdminAction label="+1 Month" onPress={() => extendSubscription(selectedUser, 1)} />
                  <AdminAction label="+3 Months" onPress={() => extendSubscription(selectedUser, 3)} />
                  <AdminAction label="Reset Password" onPress={() => sendResetPassword(selectedUser)} />
                  <AdminAction label="Reset Trial" onPress={() => resetTrial(selectedUser)} />
                  <AdminAction label="Expire User" danger onPress={() => expireUser(selectedUser)} />
                  <AdminAction
                    label={selectedUser.blocked ? 'Unblock User' : 'Block User'}
                    danger={!selectedUser.blocked}
                    onPress={() => runAdminAction(() => updateUserProfile(selectedUser.uid, { blocked: !selectedUser.blocked }), 'User access updated.')}
                  />
                  <AdminAction label="Delete User Data" danger onPress={() => confirmDeleteData(selectedUser)} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AdminAction({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, danger && styles.dangerAction]} onPress={onPress}>
      <Text style={[styles.actionText, danger && styles.dangerText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 60, paddingBottom: 80 },
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', marginTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  headerTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold' },
  headerSub: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  savingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 16 },
  savingText: { color: COLORS.textDim, fontSize: 13 },
  searchInput: { backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 14 },
  userCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 12 },
  userTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  userEmail: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  userMeta: { color: COLORS.textDim, fontSize: 11, marginBottom: 2 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  manageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  tapHint: { color: COLORS.textDim, fontSize: 12 },
  manageBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageBtnText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: COLORS.textDim, textAlign: 'center', marginTop: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { backgroundColor: COLORS.surfaceLight, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 10 },
  actionText: { color: COLORS.text, fontSize: 12, fontWeight: 'bold' },
  dangerAction: { borderColor: COLORS.error },
  dangerText: { color: COLORS.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
});
