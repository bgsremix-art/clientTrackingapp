import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, ProgressRecord, FoodLibraryItem, AppSettings } from '../models/types';
import { FOOD_LIBRARY } from '../utils/mealPlanEngine';
import { translations } from '../utils/i18n';

type ClientContextType = {
  clients: Client[];
  records: ProgressRecord[];
  ingredients: FoodLibraryItem[];
  settings: AppSettings;
  updateSettings: (s: AppSettings) => void;
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
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const defaultIngredients: FoodLibraryItem[] = [
  // Proteins
  { id: 'p1', category: 'Protein', name: 'សាច់មាន់ (Chicken Breast)', proteinBase: 23, carbBase: 0, fatBase: 1.5, calsBase: 110, icon: '🍗' },
  { id: 'p2', category: 'Protein', name: 'ត្រីរ៉ស់ (Snakehead Fish)', proteinBase: 19, carbBase: 0, fatBase: 1, calsBase: 90, icon: '🐟' },
  { id: 'p4', category: 'Protein', name: 'ស៊ុត (Whole Egg)', proteinBase: 13, carbBase: 1, fatBase: 10, calsBase: 155, icon: '🥚' },
  { id: 'p5', category: 'Protein', name: 'សាច់គោ (Beef)', proteinBase: 26, carbBase: 0, fatBase: 15, calsBase: 250, icon: '🥩' },
  { id: 'p6', category: 'Protein', name: 'ត្រីស (White Fish)', proteinBase: 20, carbBase: 0, fatBase: 1.7, calsBase: 96, icon: '🐟' },
  { id: 'p7', category: 'Protein', name: 'ត្រីសាម៉ុង (Salmon)', proteinBase: 20, carbBase: 0, fatBase: 13, calsBase: 208, icon: '🍣' },
  { id: 'p8', category: 'Protein', name: 'បង្គា (Shrimp)', proteinBase: 24, carbBase: 0.2, fatBase: 0.3, calsBase: 99, icon: '🦐' },
  
  // Carbs
  { id: 'c1', category: 'Carbs', name: 'បាយស (White Rice)', proteinBase: 3, carbBase: 28, fatBase: 0, calsBase: 130, icon: '🍚' },
  { id: 'c2', category: 'Carbs', name: 'បាយសម្រូប (Brown Rice)', proteinBase: 2.6, carbBase: 23, fatBase: 0.9, calsBase: 111, icon: '🍛' },
  { id: 'c3', category: 'Carbs', name: 'ស្រូវសាលី (Oats)', proteinBase: 13, carbBase: 68, fatBase: 6, calsBase: 379, icon: '🥣' },
  { id: 'c4', category: 'Carbs', name: 'មី (Noodles)', proteinBase: 4, carbBase: 25, fatBase: 1, calsBase: 138, icon: '🍜' },
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
  const [clients, setClients] = useState<Client[]>([]);
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [ingredients, setIngredients] = useState<FoodLibraryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ loseWeightCals: -500, gainMuscleCals: 300, gainWeightCals: 500, language: 'en' });

  useEffect(() => {
    const load = async () => {
      try {
        const c = await AsyncStorage.getItem('clients');
        const r = await AsyncStorage.getItem('records');
        const i = await AsyncStorage.getItem('ingredients');
        const s = await AsyncStorage.getItem('app_settings');
        if (c) setClients(JSON.parse(c));
        if (r) setRecords(JSON.parse(r));
        if (s) setSettings(JSON.parse(s));
        if (i) {
          let loadedI = JSON.parse(i) as FoodLibraryItem[];
          const isLatestDb = loadedI.length === defaultIngredients.length && loadedI.every(v => defaultIngredients.some(d => d.id === v.id && d.name === v.name));
          if (!isLatestDb) {
            await AsyncStorage.setItem('ingredients', JSON.stringify(defaultIngredients));
            setIngredients(defaultIngredients);
          } else {
            setIngredients(loadedI);
          }
        } else {
          setIngredients(defaultIngredients);
        }
      } catch (e) {
        console.warn("Failed to load local data");
      }
    };
    load();
  }, []);

  const save = async (key: string, data: any) => await AsyncStorage.setItem(key, JSON.stringify(data));

  const addClient = (c: Client) => { const n = [...clients, c]; setClients(n); save('clients', n); };
  const editClient = (c: Client) => { const n = clients.map(x => x.id === c.id ? c : x); setClients(n); save('clients', n); };
  const deleteClient = (id: string) => {
    const n = clients.filter(x => x.id !== id); setClients(n); save('clients', n);
    const nr = records.filter(r => r.clientId !== id); setRecords(nr); save('records', nr);
  };

  const addRecord = (r: ProgressRecord) => { const n = [...records, r]; setRecords(n); save('records', n); };
  const editRecord = (r: ProgressRecord) => { const n = records.map(x => x.id === r.id ? r : x); setRecords(n); save('records', n); };
  const deleteRecord = (id: string) => { const n = records.filter(x => x.id !== id); setRecords(n); save('records', n); };

  const addIngredient = (i: FoodLibraryItem) => { const n = [...ingredients, i]; setIngredients(n); save('ingredients', n); };
  const editIngredient = (i: FoodLibraryItem) => { const n = ingredients.map(x => x.id === i.id ? i : x); setIngredients(n); save('ingredients', n); };
  const deleteIngredient = (id: string) => { const n = ingredients.filter(x => x.id !== id); setIngredients(n); save('ingredients', n); };
  
  const updateSettings = (s: AppSettings) => { setSettings(s); save('app_settings', s); };

  const t = (key: string) => {
     const lang = settings?.language || 'en';
     const dictionary = translations[lang as keyof typeof translations] || translations.en;
     return (dictionary as any)[key] || key;
  };

  return (
    <ClientContext.Provider value={{ clients, records, ingredients, settings, t, addClient, editClient, deleteClient, addRecord, editRecord, deleteRecord, addIngredient, editIngredient, deleteIngredient, updateSettings }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error("useClients must be used within a ClientProvider");
  return context;
};
