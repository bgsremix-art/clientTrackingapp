import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../context/ClientContext';
import { UserProfile } from '../models/types';
import { getAccessStatus } from '../utils/accessStatus';

const formatDate = (value?: string) => {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BYTES_IN_GB = 1024 * 1024 * 1024;

const formatStorage = (bytes: number) => {
  if (bytes >= BYTES_IN_GB) return `${(bytes / BYTES_IN_GB).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

export type AdminUserFilter = 'all' | 'today' | 'week' | 'paid' | 'trial' | 'expired';

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

export default function AdminScreen({ navigation }: any) {
  const { user } = useAuth();
  const {
    isAdmin,
    adminUsers,
    ingredients,
    adminAppConfig,
    bakongConfig,
    refreshAdminUsers,
    updateBakongToken,
  } = useClients();

  const [bakongToken, setBakongToken] = useState('');
  const [bakongNote, setBakongNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBakongToken(bakongConfig.bakongToken || '');
    setBakongNote(bakongConfig.bakongNote || '');
  }, [bakongConfig.bakongToken, bakongConfig.bakongNote]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return adminUsers.reduce(
      (acc, profile) => {
        const activeAt = new Date(profile.lastActiveAt).getTime();
        const status = getUserAccessLabel(profile).label;
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
  }, [adminUsers]);

  const firestoreStats = useMemo(() => {
    const quotaGb = Number(adminAppConfig.storageQuotaGb) > 0 ? Number(adminAppConfig.storageQuotaGb) : 1;
    const quotaBytes = quotaGb * BYTES_IN_GB;
    const usedBytes = adminUsers.reduce((total, profile) => total + (profile.firestoreBytes || 0), 0);
    const docCount = adminUsers.reduce((total, profile) => total + (profile.firestoreDocCount || 0), 0);
    const usedPercent = quotaBytes > 0 ? Math.min((usedBytes / quotaBytes) * 100, 100) : 0;
    return {
      quotaGb,
      quotaBytes,
      usedBytes,
      freeBytes: Math.max(quotaBytes - usedBytes, 0),
      usedPercent,
      docCount,
    };
  }, [adminUsers, adminAppConfig.storageQuotaGb]);

  const cloudinaryStats = useMemo(() => {
    const quotaGb = Number(adminAppConfig.cloudinaryStorageQuotaGb) > 0 ? Number(adminAppConfig.cloudinaryStorageQuotaGb) : 25;
    const quotaBytes = quotaGb * BYTES_IN_GB;
    const usedBytes = adminUsers.reduce((total, profile) => total + (profile.storageBytes || 0), 0);
    const untrackedPhotoCount = adminUsers.reduce((total, profile) => total + (profile.untrackedPhotoCount || 0), 0);
    const uploadCount = adminUsers.reduce((total, profile) => total + (profile.storageUploadCount || 0), 0);
    const usedPercent = quotaBytes > 0 ? Math.min((usedBytes / quotaBytes) * 100, 100) : 0;
    return {
      quotaGb,
      quotaBytes,
      usedBytes,
      freeBytes: Math.max(quotaBytes - usedBytes, 0),
      usedPercent,
      uploadCount,
      untrackedPhotoCount,
    };
  }, [adminUsers, adminAppConfig.cloudinaryStorageQuotaGb]);

  const usageStats = useMemo(() => {
    const dailyReads = adminUsers.reduce((total, profile) => total + (profile.dailyReads || 0), 0);
    const dailyWrites = adminUsers.reduce((total, profile) => total + (profile.dailyWrites || 0), 0);
    
    const maxReads = 50000;
    const maxWrites = 20000;

    return {
      reads: dailyReads,
      writes: dailyWrites,
      readsPercent: Math.min((dailyReads / maxReads) * 100, 100),
      writesPercent: Math.min((dailyWrites / maxWrites) * 100, 100),
      maxReads,
      maxWrites,
    };
  }, [adminUsers]);

  const getBarColor = (percent: number) => {
    if (percent >= 90) return COLORS.error;
    if (percent >= 70) return COLORS.warning;
    return COLORS.success;
  };

  const isDangerZone = 
    firestoreStats.usedPercent >= 80 || 
    cloudinaryStats.usedPercent >= 80 || 
    usageStats.readsPercent >= 80 || 
    usageStats.writesPercent >= 80;

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
    runAdminAction(() => updateBakongToken(bakongToken, bakongNote), 'Bakong token and note updated.');
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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

      {isDangerZone && (
        <View style={{ backgroundColor: COLORS.error, padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="warning" size={24} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold', flex: 1 }}>Warning: One or more of your free tier limits is over 80%. Please check usage below.</Text>
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

      <TouchableOpacity style={styles.manageCard} onPress={() => navigation.navigate('AdminIngredients')} activeOpacity={0.85}>
        <View style={styles.manageIcon}>
          <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.manageContent}>
          <Text style={styles.manageTitle}>Ingredient Library</Text>
          <Text style={styles.manageSub}>{ingredients.length} ingredients</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="server-outline" size={22} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Firestore Database Storage</Text>
        </View>
        <View style={styles.storageMeter}>
          <View style={[styles.storageFill, { width: `${firestoreStats.usedPercent}%`, backgroundColor: getBarColor(firestoreStats.usedPercent) }]} />
        </View>
        <View style={styles.storageRow}>
          <View>
            <Text style={styles.storageValue}>{formatStorage(firestoreStats.usedBytes)}</Text>
            <Text style={styles.storageLabel}>Used Storage</Text>
          </View>
          <View style={styles.storageRight}>
            <Text style={styles.storageValue}>{formatStorage(firestoreStats.freeBytes)}</Text>
            <Text style={styles.storageLabel}>Free of {firestoreStats.quotaGb} GB Storage</Text>
          </View>
        </View>
        <View style={{ marginTop: 12, backgroundColor: COLORS.background, padding: 12, borderRadius: 8 }}>
           <Text style={[styles.helperText, { marginVertical: 0, fontWeight: 'bold' }]}>Firebase Free Tier Limits:</Text>
           <Text style={[styles.helperText, { marginVertical: 2 }]}>• Storage: 5 GB total (1 GB download/day)</Text>
           <Text style={[styles.helperText, { marginVertical: 2 }]}>• Database: 50,000 reads & 20,000 writes per day</Text>
           <Text style={[styles.helperText, { marginVertical: 2 }]}>• Active Users: 50,000 per month</Text>
           <Text style={[styles.helperText, { marginTop: 8, color: COLORS.primary }]}>Estimated from {firestoreStats.docCount} total documents.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flash-outline" size={22} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Firestore Daily Est. Reads</Text>
        </View>
        <View style={styles.storageMeter}>
          <View style={[styles.storageFill, { width: `${usageStats.readsPercent}%`, backgroundColor: getBarColor(usageStats.readsPercent) }]} />
        </View>
        <View style={styles.storageRow}>
          <View>
            <Text style={styles.storageValue}>{usageStats.reads.toLocaleString()}</Text>
            <Text style={styles.storageLabel}>Estimated Reads</Text>
          </View>
          <View style={styles.storageRight}>
            <Text style={styles.storageValue}>50k</Text>
            <Text style={styles.storageLabel}>Free Limit / Day</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Firestore Daily Est. Writes</Text>
        </View>
        <View style={styles.storageMeter}>
          <View style={[styles.storageFill, { width: `${usageStats.writesPercent}%`, backgroundColor: getBarColor(usageStats.writesPercent) }]} />
        </View>
        <View style={styles.storageRow}>
          <View>
            <Text style={styles.storageValue}>{usageStats.writes.toLocaleString()}</Text>
            <Text style={styles.storageLabel}>Estimated Writes</Text>
          </View>
          <View style={styles.storageRight}>
            <Text style={styles.storageValue}>20k</Text>
            <Text style={styles.storageLabel}>Free Limit / Day</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="images-outline" size={22} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Cloudinary Storage</Text>
        </View>
        <View style={styles.storageMeter}>
          <View style={[styles.storageFill, { width: `${cloudinaryStats.usedPercent}%`, backgroundColor: getBarColor(cloudinaryStats.usedPercent) }]} />
        </View>
        <View style={styles.storageRow}>
          <View>
            <Text style={styles.storageValue}>{formatStorage(cloudinaryStats.usedBytes)}</Text>
            <Text style={styles.storageLabel}>Used Estimate</Text>
          </View>
          <View style={styles.storageRight}>
            <Text style={styles.storageValue}>{formatStorage(cloudinaryStats.freeBytes)}</Text>
            <Text style={styles.storageLabel}>Free of {cloudinaryStats.quotaGb} GB</Text>
          </View>
        </View>
        <View style={{ marginTop: 12, backgroundColor: COLORS.background, padding: 12, borderRadius: 8 }}>
           <Text style={[styles.helperText, { marginVertical: 0, fontWeight: 'bold' }]}>Cloudinary Free Tier Limits:</Text>
           <Text style={[styles.helperText, { marginVertical: 2 }]}>• 25 Credits per month</Text>
           <Text style={[styles.helperText, { marginVertical: 2 }]}>• 1 Credit = 1 GB Storage OR 1 GB Bandwidth</Text>
           <Text style={[styles.helperText, { marginVertical: 2 }]}>• Total Tracked Uploads: {cloudinaryStats.uploadCount}</Text>
           {cloudinaryStats.untrackedPhotoCount > 0 && <Text style={[styles.helperText, { marginVertical: 2 }]}>• Old photos missing size data: {cloudinaryStats.untrackedPhotoCount}</Text>}
        </View>
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
        
        <Text style={[styles.helperText, { marginBottom: 4, marginTop: 16 }]}>Bakong Expiry Note (e.g. Expires Dec 2026)</Text>
        <TextInput
          style={styles.input}
          value={bakongNote}
          onChangeText={setBakongNote}
          placeholder="e.g. Expires 31 Dec 2026"
          placeholderTextColor={COLORS.textDim}
        />

        <Text style={styles.helperText}>Last updated: {formatDate(bakongConfig.updatedAt)}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={saveBakong} disabled={saving}>
          <Text style={styles.primaryBtnText}>Save Bakong Token & Note</Text>
        </TouchableOpacity>
      </View>

      </ScrollView>
    </KeyboardAvoidingView>
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
  manageCard: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  manageIcon: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  manageContent: { flex: 1 },
  manageTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
  manageSub: { color: COLORS.textDim, fontSize: 13, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: COLORS.background, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 },
  tokenInput: { minHeight: 110, textAlignVertical: 'top', fontSize: 12 },
  helperText: { color: COLORS.textDim, fontSize: 12, marginTop: 8, marginBottom: 12 },
  storageMeter: { height: 10, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 14 },
  storageFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 8 },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  storageRight: { alignItems: 'flex-end' },
  storageValue: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  storageLabel: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#000', fontWeight: 'bold' },
});
