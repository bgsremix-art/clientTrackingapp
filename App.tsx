import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen, { RootStackParamList } from './src/screens/DashboardScreen';
import AddClientScreen from './src/screens/AddClientScreen';
import ClientDetailScreen from './src/screens/ClientDetailScreen';
import GenerateMealPlanScreen from './src/screens/GenerateMealPlanScreen';
import ProgressRecordScreen from './src/screens/ProgressRecordScreen';

import IngredientsLibraryScreen from './src/screens/IngredientsLibraryScreen';
import AddIngredientScreen from './src/screens/AddIngredientScreen';

import SettingsScreen from './src/screens/SettingsScreen';

import { ClientProvider, useClients } from './src/context/ClientContext';
import { COLORS } from './src/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const IngredientStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ClientStackScreen() {
  const { t } = useClients();
  return (
    <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
             headerStyle: { backgroundColor: COLORS.surface },
             headerTintColor: COLORS.text,
             headerTitleStyle: { fontWeight: 'bold' },
             contentStyle: { backgroundColor: COLORS.background },
        }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('dashboardTitle'), headerShown: false }} />
      <Stack.Screen name="AddClient" component={AddClientScreen} options={{ title: t('addClientTitle') }} />
      <Stack.Screen name="ClientDetails" component={ClientDetailScreen} options={{ title: t('clientDetailsTitle'), headerShown: false }} />
      <Stack.Screen name="GenerateMealPlan" component={GenerateMealPlanScreen} options={{ title: t('generateMealPlanBtn'), headerShown: false }} />
      <Stack.Screen name="ProgressRecord" component={ProgressRecordScreen} options={{ title: t('progressHistory'), headerShown: false }} />
    </Stack.Navigator>
  )
}

function IngredientStackScreen() {
  const { t } = useClients();
  return (
    <IngredientStack.Navigator
        screenOptions={{
             headerStyle: { backgroundColor: COLORS.surface },
             headerTintColor: COLORS.text,
             headerTitleStyle: { fontWeight: 'bold' },
             contentStyle: { backgroundColor: COLORS.background },
        }}
    >
      <IngredientStack.Screen name="Library" component={IngredientsLibraryScreen} options={{ title: t('ingredientsLibrary'), headerShown: false }} />
      <IngredientStack.Screen name="AddIngredient" component={AddIngredientScreen} options={{ title: 'Add New Ingredient', headerShown: false }} />
    </IngredientStack.Navigator>
  )
}

function MainApp() {
  const { t } = useClients();
  return (
      <NavigationContainer theme={{...DarkTheme, colors: {...DarkTheme.colors, background: COLORS.background}}}>
         <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'people';
                    if (route.name === 'Clients L') iconName = focused ? 'people' : 'people-outline';
                    else if (route.name === 'Ingredients') iconName = focused ? 'restaurant' : 'restaurant-outline';
                    else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textDim,
                tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1 },
                headerShown: false,
            })}
         >
            <Tab.Screen name="Clients L" component={ClientStackScreen} options={{ title: t('tabClients') }} />
            <Tab.Screen name="Ingredients" component={IngredientStackScreen} options={{ title: t('tabIngredients') }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabSettings') }}/>
         </Tab.Navigator>
      </NavigationContainer>
  );
}

export default function App() {
  return (
    <ClientProvider>
      <StatusBar style="light" />
      <MainApp />
    </ClientProvider>
  );
}
