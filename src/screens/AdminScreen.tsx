import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../context/ClientContext';
import { UserProfile } from '../models/types';
import { getAccessStatus, TRIAL_DAYS } from '../utils/accessStatus';

const formatDate = (value?: string) => {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDisplayEmail = (profile: UserProfile) => profile.email || 'Email not saved yet';

type StatFilter = 'all' | 'today' | 'week' | 'paid' | 'trial' | 'expired';

const getUserAccessLabel = (profile: UserProfile, trialDays: number) => {
  if (profile.blocked) return { label: 'Blocked', color: COLORS.error };
  const status = getAccessStatus({
    loseWeightCals: -500,
    gainMuscleCals: 300,
    gainWeightCals: 500,
    language: 'en',
    trialStartedAt: profile.trialStartedAt,
    subscriptionExpiry: profile.subscriptionExpiry || undefined,
  }, Date.now(), trialDays);

  if (!status.active) return { label: 'Expired', color: '#ff9800' };
  if (status.type === 'subscription') return { label: `Paid ${status.days}d`, color: COLORS.primary };
  return { label: `Trial ${status.days}d`, color: '#4CAF50' };
};

export default function AdminScreen() {
  const { user } = useAuth();
  const {
    isAdmin,
    adminUsers,
    adminAppConfig,
    bakongConfig,
    refreshAdminUsers,
    updateUserProfile,
    updateUserSubscription,
    deleteUserData,
    updateAdminAppConfig,
    updateBakongToken,
  } = useClients();

  const [bakongToken, setBakongToken] = useState('');
  const [trialDays, setTrialDays] = useState((adminAppConfig.trialDays || TRIAL_DAYS).toString());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [statFilter, setStatFilter] = useState<StatFilter>('all');

  useEffect(() => {
    setBakongToken(bakongConfig.bakongToken || '');
  }, [bakongConfig.bakongToken]);

  useEffect(() => {
    setTrialDays((adminAppConfig.trialDays || TRIAL_DAYS).toString());
  }, [adminAppConfig.trialDays]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const trialDaysValue = adminAppConfig.trialDays || TRIAL_DAYS;

    return adminUsers.filter((profile) => {
      if (term && !profile.email.toLowerCase().includes(term)) {
        return false;
      }

      const activeAt = new Date(profile.lastActiveAt).getTime();
      const access = getUserAccessLabel(profile, trialDaysValue).label;

      if (statFilter === 'today') return Number.isFinite(activeAt) && now - activeAt <= day;
      if (statFilter === 'week') return Number.isFinite(activeAt) && now - activeAt <= day * 7;
      if (statFilter === 'paid') return access.startsWith('Paid');
      if (statFilter === 'trial') return access.startsWith('Trial');
      if (statFilter === 'expired') return access === 'Expired';

      return true;
    });
  }, [adminUsers, adminAppConfig.trialDays, query, statFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return adminUsers.reduce(
      (acc, profile) => {
        const activeAt = new Date(profile.lastActiveAt).getTime();
        const status = getUserAccessLabel(profile, adminAppConfig.trialDays || TRIAL_DAYS).label;
        acc.total += 1;
        if (now - activeAt <= day) acc.activeToday += 1;
        if (now - activeAt <= day * 7) acc.activeWeek += 1;
        if (status.startsWith('Paid')) acc.paid += 1;
        if (status.startsWith('Trial')) acc.trial += 1;
        if (status === 'Expired') acc.expired += 1;
        if (profile.blocked) acc.blocked += 1;
        return acc;
      },
      { total: 0, activeToday: 0, activeWeek: 0, paid: 0, trial: 0, expired: 0, blocked: 0 }
    );
  }, [adminUsers, adminAppConfig.trialDays]);

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
    const configuredTrialDays = adminAppConfig.trialDays || TRIAL_DAYS;
    const expiredTrialStart = new Date(Date.now() - (configuredTrialDays + 1) * 24 * 60 * 60 * 1000).toISOString();
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

  const saveBakong = () => {
    if (!bakongToken.trim()) {
      Alert.alert('Missing token', 'Please enter a Bakong token.');
      return;
    }
    runAdminAction(() => updateBakongToken(bakongToken), 'Bakong token updated.');
  };

  const saveAppConfig = () => {
    const days = parseInt(trialDays, 10);
    if (Number.isNaN(days) || days < 0) {
      Alert.alert('Invalid trial days', 'Please enter a valid number.');
      return;
    }
    runAdminAction(() => updateAdminAppConfig({ ...adminAppConfig, trialDays: days }), 'App config updated.');
  };

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={64} color={COLORS.textDim} />
        <Text style={styles.centerTitle}>Admin access required</Text>
        <Text style={styles.centerSub}>Logged in as {user?.email || 'unknown user'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Admin</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={refreshAdminUsers} disabled={saving}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

      {saving && (
        <View style={styles.savingBar}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.savingText}>Saving admin change...</Text>
        </View>
      )}

      <View style={styles.statGrid}>
        <StatCard label="Users" value={stats.total} active={statFilter === 'all'} onPress={() => setStatFilter('all')} />
        <StatCard label="Today" value={stats.activeToday} active={statFilter === 'today'} onPress={() => setStatFilter('today')} />
        <StatCard label="This week" value={stats.activeWeek} active={statFilter === 'week'} onPress={() => setStatFilter('week')} />
        <StatCard label="Paid" value={stats.paid} active={statFilter === 'paid'} onPress={() => setStatFilter('paid')} />
        <StatCard label="Trial" value={stats.trial} active={statFilter === 'trial'} onPress={() => setStatFilter('trial')} />
        <StatCard label="Expired" value={stats.expired} active={statFilter === 'expired'} onPress={() => setStatFilter('expired')} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="key-outline" size={22} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Bakong Token</Text>
        </View>
        <TextInput
          style={[styles.input, styles.tokenInput]}
          value={bakongToken}
          onChangeText={setBakongToken}
          placeholder="Paste Bakong token"
          placeholderTextColor={COLORS.textDim}
          multiline
          autoCapitalize="none"
        />
        <Text style={styles.helperText}>Last updated: {formatDate(bakongConfig.updatedAt)}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={saveBakong} disabled={saving}>
          <Text style={styles.primaryBtnText}>Save Bakong Token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="settings-outline" size={22} color={COLORS.primary} />
          <Text style={styles.cardTitle}>App Config</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Trial days</Text>
          <TextInput style={styles.smallInput} value={trialDays} onChangeText={setTrialDays} keyboardType="numeric" />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={saveAppConfig} disabled={saving}>
          <Text style={styles.primaryBtnText}>Save App Config</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="people-outline" size={22} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Users</Text>
            <Text style={styles.filterText}>Showing {filteredUsers.length} {statFilter === 'all' ? 'users' : statFilter}</Text>
          </View>
          {statFilter !== 'all' && (
            <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setStatFilter('all')}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search email"
          placeholderTextColor={COLORS.textDim}
          autoCapitalize="none"
        />

        {filteredUsers.map((profile) => {
          const access = getUserAccessLabel(profile, adminAppConfig.trialDays || TRIAL_DAYS);
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
      </View>

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

function StatCard({ label, value, active, onPress }: { label: string; value: number; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.statCard, active && styles.statCardActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
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
  centerSub: { color: COLORS.textDim, marginTop: 8, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { color: COLORS.text, fontSize: 36, fontWeight: 'bold' },
  iconBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  savingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 16 },
  savingText: { color: COLORS.textDim, fontSize: 13 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '31%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 },
  statCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLight },
  statValue: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  filterText: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  clearFilterBtn: { backgroundColor: COLORS.surfaceLight, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 6, paddingHorizontal: 10 },
  clearFilterText: { color: COLORS.text, fontSize: 12, fontWeight: 'bold' },
  input: { backgroundColor: COLORS.background, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 },
  tokenInput: { minHeight: 110, textAlignVertical: 'top', fontSize: 12 },
  helperText: { color: COLORS.textDim, fontSize: 12, marginTop: 8, marginBottom: 12 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#000', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  label: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  smallInput: { backgroundColor: COLORS.background, color: COLORS.text, width: 80, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  searchInput: { backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 14 },
  userCard: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 12 },
  userTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  userEmail: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  userMeta: { color: COLORS.textDim, fontSize: 11, marginBottom: 2 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  manageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  tapHint: { color: COLORS.textDim, fontSize: 12 },
  manageBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageBtnText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
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
