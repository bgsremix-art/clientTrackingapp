import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
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

export type AdminUserFilter = 'all' | 'today' | 'week' | 'paid' | 'trial' | 'expired';

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

export default function AdminScreen({ navigation }: any) {
  const { user } = useAuth();
  const {
    isAdmin,
    adminUsers,
    adminAppConfig,
    bakongConfig,
    refreshAdminUsers,
    updateAdminAppConfig,
    updateBakongToken,
  } = useClients();

  const [bakongToken, setBakongToken] = useState('');
  const [trialDays, setTrialDays] = useState((adminAppConfig.trialDays || TRIAL_DAYS).toString());
  const [adminEmailsText, setAdminEmailsText] = useState((adminAppConfig.adminEmails || []).join('\n'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBakongToken(bakongConfig.bakongToken || '');
  }, [bakongConfig.bakongToken]);

  useEffect(() => {
    setTrialDays((adminAppConfig.trialDays || TRIAL_DAYS).toString());
  }, [adminAppConfig.trialDays]);

  useEffect(() => {
    setAdminEmailsText((adminAppConfig.adminEmails || []).join('\n'));
  }, [adminAppConfig.adminEmails]);

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
    const adminEmails = adminEmailsText
      .split(/\r?\n|,/)
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
    runAdminAction(() => updateAdminAppConfig({ ...adminAppConfig, trialDays: days, adminEmails }), 'App config updated.');
  };

  const openUsers = (filter: AdminUserFilter, title: string) => {
    navigation.navigate('AdminUsers', { filter, title });
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
        <StatCard label="Users" value={stats.total} onPress={() => openUsers('all', 'All Users')} />
        <StatCard label="Today" value={stats.activeToday} onPress={() => openUsers('today', 'Active Today')} />
        <StatCard label="This week" value={stats.activeWeek} onPress={() => openUsers('week', 'Active This Week')} />
        <StatCard label="Paid" value={stats.paid} onPress={() => openUsers('paid', 'Paid Users')} />
        <StatCard label="Trial" value={stats.trial} onPress={() => openUsers('trial', 'Trial Users')} />
        <StatCard label="Expired" value={stats.expired} onPress={() => openUsers('expired', 'Expired Users')} />
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
        <Text style={styles.label}>Admin emails</Text>
        <TextInput
          style={[styles.input, styles.emailInput]}
          value={adminEmailsText}
          onChangeText={setAdminEmailsText}
          placeholder="admin@example.com"
          placeholderTextColor={COLORS.textDim}
          autoCapitalize="none"
          multiline
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={saveAppConfig} disabled={saving}>
          <Text style={styles.primaryBtnText}>Save App Config</Text>
        </TouchableOpacity>
      </View>

      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, onPress }: { label: string; value: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={COLORS.textDim} style={styles.statIcon} />
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
  statCard: { width: '31%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, minHeight: 82 },
  statIcon: { position: 'absolute', right: 8, bottom: 8 },
  statValue: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: COLORS.background, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 },
  tokenInput: { minHeight: 110, textAlignVertical: 'top', fontSize: 12 },
  emailInput: { minHeight: 84, textAlignVertical: 'top', marginTop: 8, marginBottom: 14 },
  helperText: { color: COLORS.textDim, fontSize: 12, marginTop: 8, marginBottom: 12 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#000', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  label: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  smallInput: { backgroundColor: COLORS.background, color: COLORS.text, width: 80, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
});
