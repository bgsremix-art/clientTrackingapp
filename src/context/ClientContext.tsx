import React, { createContext, useState, useContext, useEffect } from 'react';
import { collection, collectionGroup, deleteField, doc, getDoc, getDocs, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { Client, ProgressRecord, FoodLibraryItem, AppSettings, AttendanceRecord, UserProfile, AdminAppConfig, BakongAdminConfig } from '../models/types';
import { translations } from '../utils/i18n';
import { ADMIN_EMAILS } from '../constants/admin';

type ClientContextType = {
  clients: Client[];
  records: ProgressRecord[];
  ingredients: FoodLibraryItem[];
  attendance: AttendanceRecord[];
  settings: AppSettings;
  settingsLoaded: boolean;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  adminUsers: UserProfile[];
  adminAppConfig: AdminAppConfig;
  bakongConfig: BakongAdminConfig;
  updateSettings: (s: AppSettings) => void;
  refreshAdminUsers: () => Promise<void>;
  updateUserProfile: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  updateUserSubscription: (uid: string, subscriptionExpiry?: string, trialStartedAt?: string) => Promise<void>;
  deleteUserData: (uid: string) => Promise<void>;
  updateAdminAppConfig: (config: AdminAppConfig) => Promise<void>;
  updateBakongToken: (token: string, note?: string) => Promise<void>;
  t: (key: string) => string;
  addClient: (client: Client) => void;
  editClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addRecord: (record: ProgressRecord) => void;
  editRecord: (record: ProgressRecord) => void;
  deleteRecord: (id: string) => void;
  addIngredient: (item: FoodLibraryItem) => void;
  editIngredient: (item: FoodLibraryItem) => void;
  deleteIngredient: (id: string) => void;
  restoreDefaultIngredients: () => void;
  toggleAttendance: (clientId: string, date: string, notes?: string, forceStatus?: boolean) => void;
  deleteAttendance: (id: string) => void;
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const normalizeEmails = (emails: string[]) => Array.from(new Set(
  emails.map(email => email.trim().toLowerCase()).filter(Boolean)
));

const getAdminEmailsFromData = (data: any) => {
  const emails: string[] = [];

  if (Array.isArray(data.adminEmails)) emails.push(...data.adminEmails);
  if (Array.isArray(data.emails)) emails.push(...data.emails);
  if (typeof data.adminEmail === 'string') emails.push(data.adminEmail);
  if (typeof data.email === 'string') emails.push(data.email);

  return normalizeEmails(emails);
};

const getArrayLength = (value: any) => Array.isArray(value) ? value.length : 0;

const estimateFirestoreDocBytes = (path: string, data: any) => {
  try {
    return unescape(encodeURIComponent(`${path}:${JSON.stringify(data || {})}`)).length;
  } catch {
    return path.length;
  }
};

const defaultIngredients: FoodLibraryItem[] = [
  // Proteins
  { id: 'p1', category: 'Protein', name: 'សាច់ទ្រូងមាន់ (Chicken Breast)', proteinBase: 23, carbBase: 0, fatBase: 1.5, calsBase: 110, icon: '🍗' },
  { id: 'p2', category: 'Protein', name: 'ត្រីរ៉ស់ (Snakehead Fish)', proteinBase: 19, carbBase: 0, fatBase: 1, calsBase: 90, icon: '🐟' },
  { id: 'p4', category: 'Protein', name: 'ស៊ុត (Whole Egg)', proteinBase: 13, carbBase: 1, fatBase: 10, calsBase: 155, icon: '🥚' },
  { id: 'p5', category: 'Protein', name: 'សាច់គោ (Beef)', proteinBase: 26, carbBase: 0, fatBase: 15, calsBase: 250, icon: '🥩' },
  { id: 'p6', category: 'Protein', name: 'ត្រីសមុទ្រ (Sea Fish)', proteinBase: 20, carbBase: 0, fatBase: 1.7, calsBase: 96, icon: '🐟' },
  { id: 'p7', category: 'Protein', name: 'ត្រីសាម៉ុង (Salmon)', proteinBase: 20, carbBase: 0, fatBase: 13, calsBase: 208, icon: '🍣' },
  { id: 'p8', category: 'Protein', name: 'បង្គា (Shrimp)', proteinBase: 24, carbBase: 0.2, fatBase: 0.3, calsBase: 99, icon: '🦐' },

  // Carbs
  { id: 'c1', category: 'Carbs', name: 'បាយស (White Rice)', proteinBase: 3, carbBase: 28, fatBase: 0, calsBase: 130, icon: '🍚' },
  { id: 'c2', category: 'Carbs', name: 'បាយសម្រូប (Brown Rice)', proteinBase: 2.6, carbBase: 23, fatBase: 0.9, calsBase: 111, icon: '🍛' },
  { id: 'c3', category: 'Carbs', name: 'ស្រូវសាលី (Oats)', proteinBase: 13, carbBase: 68, fatBase: 6, calsBase: 379, icon: '🥣' },

  { id: 'c5', category: 'Carbs', name: 'ដំឡូងជ្វា (Sweet Potato)', proteinBase: 1.6, carbBase: 20, fatBase: 0, calsBase: 86, icon: '🍠' },
  { id: 'c6', category: 'Carbs', name: 'នំប៉័ង (Baguette)', proteinBase: 9, carbBase: 50, fatBase: 3, calsBase: 270, icon: '🥖' },

  // Veggies
  { id: 'v1', category: 'Veggies', name: 'ត្រកួន (Morning Glory)', proteinBase: 2.6, carbBase: 3, fatBase: 0.2, calsBase: 19, icon: '🌿' },
  { id: 'v2', category: 'Veggies', name: 'ស្ពៃក្តោប (Cabbage)', proteinBase: 1.3, carbBase: 6, fatBase: 0.1, calsBase: 25, icon: '🥬' },
  { id: 'v3', category: 'Veggies', name: 'ត្រសក់ (Cucumber)', proteinBase: 0.6, carbBase: 3.6, fatBase: 0.1, calsBase: 15, icon: '🥒' },
  { id: 'v4', category: 'Veggies', name: 'ស្លឹកបាស (Ivy Gourd)', proteinBase: 3, carbBase: 3, fatBase: 0, calsBase: 18, icon: '🌿' },
  { id: 'v5', category: 'Veggies', name: 'ស្ពៃខៀវ (Mustard Greens)', proteinBase: 2.9, carbBase: 4.7, fatBase: 0.4, calsBase: 27, icon: '🥬' },
  { id: 'v6', category: 'Veggies', name: 'ល្ពៅ (Pumpkin)', proteinBase: 1, carbBase: 6.5, fatBase: 0.1, calsBase: 26, icon: '🎃' },
  { id: 'v7', category: 'Veggies', name: 'សណ្តែកកួរ (Yard-long Beans)', proteinBase: 2.8, carbBase: 8.3, fatBase: 0.4, calsBase: 47, icon: '🌱' },
  { id: 'v8', category: 'Veggies', name: 'សណ្តែកបណ្តុះ (Bean Sprouts)', proteinBase: 3, carbBase: 5.9, fatBase: 0.2, calsBase: 30, icon: '🥗' },
  { id: 'v9', category: 'Veggies', name: 'ស្ពៃតឿ (Bok Choy)', proteinBase: 1.5, carbBase: 2.2, fatBase: 0.2, calsBase: 13, icon: '🥬' },
  { id: 'v10', category: 'Veggies', name: 'ខាត់ណា (Chinese Kale)', proteinBase: 1.2, carbBase: 5.6, fatBase: 0.8, calsBase: 30, icon: '🥦' },
  { id: 'v11', category: 'Veggies', name: 'ប៉េងប៉ោះ (Tomato)', proteinBase: 0.9, carbBase: 3.9, fatBase: 0.2, calsBase: 18, icon: '🍅' },
  { id: 'v12', category: 'Veggies', name: 'ត្រឡាច (Winter Melon)', proteinBase: 0.4, carbBase: 3, fatBase: 0.2, calsBase: 13, icon: '🥒' },
  { id: 'v13', category: 'Veggies', name: 'ម្រះ (Bitter Melon)', proteinBase: 1, carbBase: 3.7, fatBase: 0.2, calsBase: 17, icon: '🥒' },
  { id: 'v14', category: 'Veggies', name: 'ននោង (Luffa)', proteinBase: 1.2, carbBase: 4.3, fatBase: 0.2, calsBase: 20, icon: '🥒' },
  { id: 'v15', category: 'Veggies', name: 'ត្រប់វែង (Eggplant)', proteinBase: 1, carbBase: 6, fatBase: 0.2, calsBase: 25, icon: '🍆' },
  { id: 'v16', category: 'Veggies', name: 'ការ៉ុត (Carrots)', proteinBase: 0.9, carbBase: 10, fatBase: 0.2, calsBase: 41, icon: '🥕' },
  { id: 'v17', category: 'Veggies', name: 'ម្ទេសផ្លោកក្រហម (Red Bell Pepper)', proteinBase: 1, carbBase: 6, fatBase: 0.3, calsBase: 31, icon: '🌶️' },
  { id: 'v18', category: 'Veggies', name: 'ខ្ទឹមបារាំង (Onion)', proteinBase: 1.1, carbBase: 9.3, fatBase: 0.1, calsBase: 40, icon: '🧅' },
  { id: 'v19', category: 'Veggies', name: 'ខ្ញី (Ginger)', proteinBase: 1.8, carbBase: 18, fatBase: 0.7, calsBase: 80, icon: '🫚' },
  { id: 'v20', category: 'Veggies', name: 'ឆៃថាវ (Radish)', proteinBase: 0.6, carbBase: 4.1, fatBase: 0.1, calsBase: 18, icon: '🥕' },
  { id: 'v21', category: 'Veggies', name: 'ខាត់ណាខៀវ (Broccoli)', proteinBase: 2.8, carbBase: 7, fatBase: 0.4, calsBase: 34, icon: '🥦' },
  { id: 'v22', category: 'Veggies', name: 'ខាត់ណាផ្កា (Cauliflower)', proteinBase: 1.9, carbBase: 5, fatBase: 0.3, calsBase: 25, icon: '🥦' },
  { id: 'v23', category: 'Veggies', name: 'ពោតបារាំង (Okra)', proteinBase: 1.9, carbBase: 7, fatBase: 0.2, calsBase: 33, icon: '🌿' },
  { id: 'v24', category: 'Veggies', name: 'ផ្សិត (Mushrooms)', proteinBase: 3, carbBase: 3.3, fatBase: 0.3, calsBase: 22, icon: '🍄' },

  // Fruits
  { id: 'fr1', category: 'Fruits', name: 'ចេក (Banana)', proteinBase: 1.1, carbBase: 23, fatBase: 0.3, calsBase: 89, icon: '🍌' },
  { id: 'fr2', category: 'Fruits', name: 'ស្វាយទុំ (Ripe Mango)', proteinBase: 0.8, carbBase: 15, fatBase: 0.4, calsBase: 60, icon: '🥭' },
  { id: 'fr3', category: 'Fruits', name: 'ល្ហុងទុំ (Papaya)', proteinBase: 0.5, carbBase: 11, fatBase: 0.3, calsBase: 43, icon: '🍈' },
  { id: 'fr4', category: 'Fruits', name: 'ត្របែក (Guava)', proteinBase: 2.6, carbBase: 14, fatBase: 1, calsBase: 68, icon: '🍐' },
  { id: 'fr5', category: 'Fruits', name: 'ផាសិន (Passion Fruit)', proteinBase: 2.2, carbBase: 23, fatBase: 0.7, calsBase: 97, icon: '🥭' },
  { id: 'fr6', category: 'Fruits', name: 'ផ្លែប៊ឺរ (Avocado)', proteinBase: 2, carbBase: 9, fatBase: 15, calsBase: 160, icon: '🥑' },
  { id: 'fr7', category: 'Fruits', name: 'ផ្លែប៉ោមខៀវ (Green Apple)', proteinBase: 0.3, carbBase: 14, fatBase: 0.2, calsBase: 52, icon: '🍏' },
  { id: 'fr8', category: 'Fruits', name: 'ស្រកានាគ (Dragon Fruit)', proteinBase: 1.2, carbBase: 13, fatBase: 0, calsBase: 60, icon: '🐉' },
  { id: 'fr9', category: 'Fruits', name: 'ម្នាស់ (Pineapple)', proteinBase: 0.5, carbBase: 13, fatBase: 0.1, calsBase: 50, icon: '🍍' },
  { id: 'fr10', category: 'Fruits', name: 'ក្រូចថ្លុង (Pomelo)', proteinBase: 0.8, carbBase: 10, fatBase: 0, calsBase: 38, icon: '🍈' },
  { id: 'fr11', category: 'Fruits', name: 'ឪឡឹក (Watermelon)', proteinBase: 0.6, carbBase: 8, fatBase: 0.2, calsBase: 30, icon: '🍉' },
  { id: 'fr12', category: 'Fruits', name: 'ជម្ពូ (Java Apple)', proteinBase: 0.6, carbBase: 5.7, fatBase: 0.3, calsBase: 25, icon: '🍎' }
];

export const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [ingredients, setIngredients] = useState<FoodLibraryItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ loseWeightCals: -500, gainMuscleCals: 300, gainWeightCals: 500, language: 'en' });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminAppConfig, setAdminAppConfig] = useState<AdminAppConfig>({});
  const [startAdminEmails, setStartAdminEmails] = useState<string[]>([]);
  const [bakongConfig, setBakongConfig] = useState<BakongAdminConfig>({});

  const fallbackAdminEmails = normalizeEmails(ADMIN_EMAILS);
  const configAdminEmails = normalizeEmails(adminAppConfig.adminEmails || []);
  const firebaseAdminEmails = normalizeEmails([...configAdminEmails, ...startAdminEmails]);
  const allAdminEmails = normalizeEmails([...fallbackAdminEmails, ...firebaseAdminEmails]);
  const emailIsAdmin = user?.email ? allAdminEmails.includes(user.email.toLowerCase()) : false;
  const isAdmin = emailIsAdmin;
  const mergedAdminAppConfig = { ...adminAppConfig, adminEmails: firebaseAdminEmails };

  useEffect(() => {
    if (!user) {
      setClients([]);
      setRecords([]);
      setIngredients([]);
      setAttendance([]);
      setSettingsLoaded(false);
      setUserProfile(null);
      setAdminUsers([]);
      setStartAdminEmails([]);
      return;
    }

    const uid = user.uid;
    const profileRef = doc(db, 'users', uid);
    const now = new Date().toISOString();
    const shouldStartTrial = user.emailVerified;
    const baseProfile: UserProfile = {
      uid,
      email: user.email || '',
      createdAt: now,
      lastActiveAt: now,
      platform: Platform.OS,
      appVersion: '1.0.0',
      role: emailIsAdmin ? 'admin' : 'user',
      blocked: false,
    };

    getDoc(profileRef).then((profileSnap) => {
      if (profileSnap.exists()) {
        const existing = profileSnap.data() as UserProfile;
        const updates: Partial<UserProfile> = {
          email: user.email || existing.email || '',
          lastActiveAt: now,
          platform: Platform.OS,
          appVersion: '1.0.0',
        };
        if (emailIsAdmin && existing.role !== 'admin') {
          updates.role = 'admin';
        }
        if (!emailIsAdmin && existing.role === 'admin') {
          updates.role = 'user';
        }
        setDoc(profileRef, updates, { merge: true });
      } else {
        setDoc(profileRef, baseProfile);
      }
    });

    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      } else {
        setUserProfile(baseProfile);
      }
    });

    const unsubClients = onSnapshot(collection(db, 'users', uid, 'clients'), (snap) => {
      setClients(snap.docs.map(d => d.data() as Client));
    });

    const unsubRecords = onSnapshot(collection(db, 'users', uid, 'records'), (snap) => {
      setRecords(snap.docs.map(d => d.data() as ProgressRecord));
    });

    const unsubSettings = onSnapshot(doc(db, 'users', uid, 'settings', 'app_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;

        // Initialize trial only after email verification.
        if (!data.trialStartedAt && shouldStartTrial) {
          const initializedSettings = {
            ...data,
            trialStartedAt: new Date().toISOString()
          };
          setSettings(prev => ({
            ...prev,
            ...initializedSettings,
            gymLogo: prev.gymLogo,
            gymName: prev.gymName,
            trainerName: prev.trainerName,
          }));
          setDoc(profileRef, {
            trialStartedAt: initializedSettings.trialStartedAt,
            subscriptionExpiry: initializedSettings.subscriptionExpiry || ''
          }, { merge: true });
          setDoc(doc(db, 'users', uid, 'settings', 'app_settings'), {
            trialStartedAt: initializedSettings.trialStartedAt
          }, { merge: true });
        } else {
          setSettings(prev => ({
            ...prev,
            ...data,
            // Ensure local branding is never overwritten by Firestore
            gymLogo: prev.gymLogo,
            gymName: prev.gymName,
            trainerName: prev.trainerName,
          }));
          setDoc(profileRef, {
            trialStartedAt: data.trialStartedAt || '',
            subscriptionExpiry: data.subscriptionExpiry || ''
          }, { merge: true });
        }
        setSettingsLoaded(true);
      } else {
        const initialSettings: AppSettings = {
          loseWeightCals: -500,
          gainMuscleCals: 300,
          gainWeightCals: 500,
          language: 'en'
        };
        if (shouldStartTrial) {
          initialSettings.trialStartedAt = new Date().toISOString();
        }
        setSettings(prev => ({
          ...prev,
          ...initialSettings,
          gymLogo: prev.gymLogo,
          gymName: prev.gymName,
          trainerName: prev.trainerName,
        }));
        setSettingsLoaded(true);
        setDoc(profileRef, {
          trialStartedAt: initialSettings.trialStartedAt || '',
          subscriptionExpiry: initialSettings.subscriptionExpiry || ''
        }, { merge: true });
        setDoc(doc(db, 'users', uid, 'settings', 'app_settings'), initialSettings);
      }
    });

    const unsubIngredients = onSnapshot(collection(db, 'users', uid, 'ingredients'), (snap) => {
      if (snap.empty) {
        // Seed default ingredients to Firestore
        defaultIngredients.forEach(ing => {
          setDoc(doc(db, 'users', uid, 'ingredients', ing.id), ing);
        });
      } else {
        setIngredients(snap.docs.map(d => d.data() as FoodLibraryItem));
      }
    });

    const unsubAttendance = onSnapshot(collection(db, 'users', uid, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(d => d.data() as AttendanceRecord));
    });

    const unsubStorage = onSnapshot(collection(db, 'users', uid, 'storage_uploads'), (snap) => {
      const storageBytes = snap.docs.reduce((total, uploadDoc) => total + (Number(uploadDoc.data().bytes) || 0), 0);
      setDoc(profileRef, { 
        storageBytes, 
        storageUploadCount: snap.size,
        lastActiveAt: new Date().toISOString() 
      }, { merge: true });
    });

    return () => {
      unsubProfile();
      unsubClients();
      unsubRecords();
      unsubSettings();
      unsubIngredients();
      unsubAttendance();
      unsubStorage();
    };
  }, [user, user?.emailVerified]);

  // AUTO-UPDATE USAGE STATS ON PROFILE FOR REAL-TIME ADMIN VIEW
  useEffect(() => {
    if (!user || !settingsLoaded) return;
    
    const updateUsageStats = async () => {
      const uid = user.uid;
      const profileRef = doc(db, 'users', uid);
      
      const firestoreBytes = 
        estimateFirestoreDocBytes(`users/${uid}`, userProfile) +
        estimateFirestoreDocBytes(`users/${uid}/settings/app_settings`, settings) +
        clients.reduce((t, c) => t + estimateFirestoreDocBytes(`users/${uid}/clients/${c.id}`, c), 0) +
        records.reduce((t, r) => t + estimateFirestoreDocBytes(`users/${uid}/records/${r.id}`, r), 0) +
        ingredients.reduce((t, i) => t + estimateFirestoreDocBytes(`users/${uid}/ingredients/${i.id}`, i), 0) +
        attendance.reduce((t, a) => t + estimateFirestoreDocBytes(`users/${uid}/attendance/${a.id}`, a), 0);

      const dailyReads = (clients.length * 25) + (records.length * 10) + (ingredients.length * 2) + (attendance.length * 10) + 150;
      const dailyWrites = Math.max(5, Math.floor(records.length / 3) + Math.floor(attendance.length / 3) + 10);

      await setDoc(profileRef, {
        clientCount: clients.length,
        recordCount: records.length,
        ingredientCount: ingredients.length,
        attendanceCount: attendance.length,
        firestoreBytes,
        firestoreDocCount: 2 + clients.length + records.length + ingredients.length + attendance.length,
        dailyReads,
        dailyWrites,
        lastActiveAt: new Date().toISOString()
      }, { merge: true });
    };

    const timeout = setTimeout(updateUsageStats, 3000); 
    return () => clearTimeout(timeout);
  }, [user, clients.length, records.length, ingredients.length, attendance.length, settingsLoaded]);

  // Load and sync local-only branding (Gym Logo, Gym Name, Trainer Name)
  useEffect(() => {
    const loadLocalBranding = async () => {
      if (!user) return;
      try {
        const localData = await AsyncStorage.getItem(`branding_${user.uid}`);
        if (localData) {
          const branding = JSON.parse(localData);
          console.log(`Loaded local branding for ${user.uid}:`, branding);
          setSettings(prev => ({
            ...prev,
            gymName: branding.gymName,
            trainerName: branding.trainerName,
            gymLogo: branding.gymLogo,
          }));
        } else {
          console.log(`No local branding found for ${user.uid}`);
        }
      } catch (e) {
        console.error('Failed to load local branding:', e);
      }
    };
    loadLocalBranding();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubStart = onSnapshot(collection(db, 'start'), (snap) => {
      const emails = snap.docs.flatMap(document => getAdminEmailsFromData(document.data()));
      setStartAdminEmails(normalizeEmails(emails));
    }, (error) => {
      console.log('Error fetching start admin emails:', error);
      setStartAdminEmails([]);
    });

    return unsubStart;
  }, [user]);

  useEffect(() => {
    if (!user || !emailIsAdmin) return;

    setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
  }, [user, emailIsAdmin]);

  const cleanData = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
      if (newObj[key] === undefined) {
        delete newObj[key];
      }
    });
    return newObj;
  };

  const addClient = (c: Client) => { if (user) setDoc(doc(db, 'users', user.uid, 'clients', c.id), cleanData(c)); };
  const editClient = (c: Client) => { if (user) setDoc(doc(db, 'users', user.uid, 'clients', c.id), cleanData(c)); };
  const deleteClient = (id: string) => {
    if (!user) return;
    deleteDoc(doc(db, 'users', user.uid, 'clients', id));
    records.filter(r => r.clientId === id).forEach(r => deleteDoc(doc(db, 'users', user.uid, 'records', r.id)));
  };

  const addRecord = (r: ProgressRecord) => { if (user) setDoc(doc(db, 'users', user.uid, 'records', r.id), r); };
  const editRecord = (r: ProgressRecord) => { if (user) setDoc(doc(db, 'users', user.uid, 'records', r.id), r); };
  const deleteRecord = (id: string) => { if (user) deleteDoc(doc(db, 'users', user.uid, 'records', id)); };

  const addIngredient = (i: FoodLibraryItem) => { if (user) setDoc(doc(db, 'users', user.uid, 'ingredients', i.id), i); };
  const editIngredient = (i: FoodLibraryItem) => { if (user) setDoc(doc(db, 'users', user.uid, 'ingredients', i.id), i); };
  const deleteIngredient = (id: string) => { if (user) deleteDoc(doc(db, 'users', user.uid, 'ingredients', id)); };

  const restoreDefaultIngredients = () => {
    if (!user) return;
    defaultIngredients.forEach(ing => {
      setDoc(doc(db, 'users', user.uid, 'ingredients', ing.id), ing);
    });
  };

  useEffect(() => {
    if (!user?.emailVerified || !settingsLoaded || settings.trialStartedAt) return;

    updateSettings({ ...settings, trialStartedAt: new Date().toISOString() });
  }, [user?.emailVerified, settingsLoaded, settings.trialStartedAt]);

  const updateSettings = async (s: AppSettings) => {
    setSettings(s);
    await AsyncStorage.setItem('app_settings', JSON.stringify(s));

    if (user) {
      // PERSIST BRANDING LOCALLY ONLY
      const branding = {
        gymName: s.gymName || '',
        trainerName: s.trainerName || '',
        gymLogo: s.gymLogo || ''
      };
      await AsyncStorage.setItem(`branding_${user.uid}`, JSON.stringify(branding));

      // STRIP BRANDING FROM CLOUD SAVE
      const { gymLogo, gymName, trainerName, ...cloudSettings } = s;
      await setDoc(doc(db, 'users', user.uid, 'settings', 'app_settings'), cloudSettings);
      
      // Update user root profile and explicitly remove branding fields from cloud
      await setDoc(doc(db, 'users', user.uid), { 
        gymName: deleteField(),
        trainerName: deleteField(),
        gymLogo: deleteField(),
        trialStartedAt: s.trialStartedAt || '',
        subscriptionExpiry: s.subscriptionExpiry || '',
      }, { merge: true });
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setAdminUsers([]);
      return;
    }

    const unsubBakong = onSnapshot(doc(db, 'admin', 'config'), (snap) => {
      setBakongConfig(snap.exists() ? (snap.data() as BakongAdminConfig) : {});
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const profiles = snap.docs.map(d => d.data() as UserProfile);
      setAdminUsers(profiles.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()));
    });

    return () => {
      unsubBakong();
      unsubUsers();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;
    const unsubAdminApp = onSnapshot(doc(db, 'admin_config', 'app'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AdminAppConfig;
        setAdminAppConfig(data);
      } else {
        setAdminAppConfig({ adminEmails: ADMIN_EMAILS });
      }
    });

    return unsubAdminApp;
  }, [user]);

  const assertAdmin = () => {
    if (!isAdmin || !user) {
      throw new Error('Admin access required');
    }
  };

  const refreshAdminUsers = async () => {
    if (!isAdmin) return;
    const usersSnap = await getDocs(collection(db, 'users'));
    const settingsSnap = await getDocs(collectionGroup(db, 'settings'));

    const userIds = new Set<string>();
    usersSnap.docs.forEach((userDoc) => userIds.add(userDoc.id));
    settingsSnap.docs.forEach((settingsDoc) => {
      if (settingsDoc.id === 'app_settings') {
        const userDocRef = settingsDoc.ref.parent.parent;
        if (userDocRef) userIds.add(userDocRef.id);
      }
    });

    const profiles = await Promise.all(Array.from(userIds).map(async (uid) => {
      const profileSnap = await getDoc(doc(db, 'users', uid));
      const profile = profileSnap.exists() ? profileSnap.data() as Partial<UserProfile> : {};
      const settingsSnap = await getDoc(doc(db, 'users', uid, 'settings', 'app_settings'));
      const userSettings = settingsSnap.exists() ? settingsSnap.data() as AppSettings : null;
      const [clientsSnap, recordsSnap, ingredientsSnap, attendanceSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'clients')),
        getDocs(collection(db, 'users', uid, 'records')),
        getDocs(collection(db, 'users', uid, 'ingredients')),
        getDocs(collection(db, 'users', uid, 'attendance')),
      ]);
      const storageUploadsSnap = await getDocs(collection(db, 'users', uid, 'storage_uploads'));
      const storageBytes = storageUploadsSnap.docs.reduce((total, uploadDoc) => {
        const data = uploadDoc.data();
        return total + (Number(data.bytes) || 0);
      }, 0);
      const firestoreDocs = [
        ...(profileSnap.exists() ? [{ path: profileSnap.ref.path, data: profileSnap.data() }] : []),
        ...(settingsSnap.exists() ? [{ path: settingsSnap.ref.path, data: settingsSnap.data() }] : []),
        ...clientsSnap.docs.map(document => ({ path: document.ref.path, data: document.data() })),
        ...recordsSnap.docs.map(document => ({ path: document.ref.path, data: document.data() })),
        ...ingredientsSnap.docs.map(document => ({ path: document.ref.path, data: document.data() })),
        ...attendanceSnap.docs.map(document => ({ path: document.ref.path, data: document.data() })),
        ...storageUploadsSnap.docs.map(document => ({ path: document.ref.path, data: document.data() })),
      ];
      const firestoreBytes = firestoreDocs.reduce((total, document) => total + estimateFirestoreDocBytes(document.path, document.data), 0);
      const cloudPhotoCount =
        clientsSnap.docs.filter(clientDoc => !!(clientDoc.data() as Client).imageUri).length +
        recordsSnap.docs.reduce((total, recordDoc) => total + getArrayLength((recordDoc.data() as ProgressRecord).photoUris), 0) +
        ingredientsSnap.docs.filter(ingredientDoc => !!(ingredientDoc.data() as FoodLibraryItem).imageUri).length;
      const untrackedPhotoCount = Math.max(cloudPhotoCount - storageUploadsSnap.size, 0);

      const dailyReads = (clientsSnap.size * 25) + (recordsSnap.size * 10) + (ingredientsSnap.size * 2) + (attendanceSnap.size * 10) + 150;
      const dailyWrites = Math.max(5, Math.floor(recordsSnap.size / 3) + Math.floor(attendanceSnap.size / 3) + 10);

      const updatedProfile: UserProfile = {
        ...profile,
        uid: profile.uid || uid,
        email: profile.email || '',
        createdAt: profile.createdAt || '',
        lastActiveAt: profile.lastActiveAt || profile.createdAt || '',
        platform: profile.platform || 'unknown',
        appVersion: profile.appVersion || 'unknown',
        role: profile.role || 'user',
        trialStartedAt: userSettings?.trialStartedAt || profile.trialStartedAt || '',
        subscriptionExpiry: userSettings?.subscriptionExpiry || profile.subscriptionExpiry || '',
        clientCount: clientsSnap.size,
        recordCount: recordsSnap.size,
        ingredientCount: ingredientsSnap.size,
        attendanceCount: attendanceSnap.size,
        firestoreBytes,
        firestoreDocCount: firestoreDocs.length,
        storageBytes,
        storageUploadCount: storageUploadsSnap.size,
        untrackedPhotoCount,
        dailyReads,
        dailyWrites,
      };

      // Save synced stats back to Firestore so real-time listeners get them
      await setDoc(doc(db, 'users', uid), updatedProfile, { merge: true });
      return updatedProfile;
    }));
    setAdminUsers(profiles.filter((profile): profile is UserProfile => !!profile).sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()));
  };

  const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
    assertAdmin();
    await setDoc(doc(db, 'users', uid), updates, { merge: true });
    await refreshAdminUsers();
  };

  const updateUserSubscription = async (uid: string, subscriptionExpiry?: string, trialStartedAt?: string) => {
    assertAdmin();
    const update: Partial<AppSettings> = {};
    if (subscriptionExpiry !== undefined) update.subscriptionExpiry = subscriptionExpiry;
    if (trialStartedAt !== undefined) update.trialStartedAt = trialStartedAt;
    await setDoc(doc(db, 'users', uid, 'settings', 'app_settings'), update, { merge: true });
    await setDoc(doc(db, 'users', uid), update, { merge: true });
    await refreshAdminUsers();
  };

  const deleteCollectionDocs = async (uid: string, collectionName: string) => {
    const snap = await getDocs(collection(db, 'users', uid, collectionName));
    await Promise.all(snap.docs.map((document) => deleteDoc(document.ref)));
  };

  const deleteUserData = async (uid: string) => {
    assertAdmin();
    await Promise.all([
      deleteCollectionDocs(uid, 'clients'),
      deleteCollectionDocs(uid, 'records'),
      deleteCollectionDocs(uid, 'ingredients'),
      deleteCollectionDocs(uid, 'attendance'),
    ]);
    await refreshAdminUsers();
  };

  const updateAdminAppConfig = async (config: AdminAppConfig) => {
    assertAdmin();
    const nextConfig = {
      ...config,
      adminEmails: normalizeEmails(config.adminEmails || []),
      storageQuotaGb: Number(config.storageQuotaGb) > 0 ? Number(config.storageQuotaGb) : 1,
      cloudinaryStorageQuotaGb: Number(config.cloudinaryStorageQuotaGb) > 0 ? Number(config.cloudinaryStorageQuotaGb) : 25,
    };
    await Promise.all([
      setDoc(doc(db, 'admin_config', 'app'), { ...nextConfig, trialDays: deleteField() }, { merge: true }),
      setDoc(doc(db, 'start', 'admin'), {
        adminEmails: nextConfig.adminEmails,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid,
      }, { merge: true }),
    ]);
  };

  const updateBakongToken = async (token: string, note?: string) => {
    assertAdmin();
    await setDoc(doc(db, 'admin', 'config'), {
      bakongToken: token.trim(),
      bakongNote: note?.trim() || '',
      updatedAt: new Date().toISOString(),
      updatedBy: user?.uid,
    }, { merge: true });
  };

  const toggleAttendance = (clientId: string, date: string, notes?: string, forceStatus?: boolean) => {
    if (!user) return;
    const existing = attendance.find(a => a.clientId === clientId && a.date === date);
    const id = existing ? existing.id : `${clientId}_${date}`;
    const record: AttendanceRecord = {
      id,
      clientId,
      date,
      attended: forceStatus !== undefined ? forceStatus : (existing ? !existing.attended : true),
      notes: notes !== undefined ? notes : (existing?.notes || '')
    };
    setDoc(doc(db, 'users', user.uid, 'attendance', id), record);
  };

  const deleteAttendance = (id: string) => {
    if (user) deleteDoc(doc(db, 'users', user.uid, 'attendance', id));
  };

  const t = (key: string) => {
    const lang = settings?.language || 'en';
    const dictionary = translations[lang as keyof typeof translations] || translations.en;
    return (dictionary as any)[key] || key;
  };

  return (
    <ClientContext.Provider value={{ clients, records, ingredients, attendance, settings, settingsLoaded, userProfile, isAdmin, adminUsers, adminAppConfig: mergedAdminAppConfig, bakongConfig, t, addClient, editClient, deleteClient, addRecord, editRecord, deleteRecord, addIngredient, editIngredient, deleteIngredient, restoreDefaultIngredients, updateSettings, refreshAdminUsers, updateUserProfile, updateUserSubscription, deleteUserData, updateAdminAppConfig, updateBakongToken, toggleAttendance, deleteAttendance }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error("useClients must be used within a ClientProvider");
  return context;
};
