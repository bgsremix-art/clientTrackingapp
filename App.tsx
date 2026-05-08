import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import DashboardScreen, { RootStackParamList } from './src/screens/DashboardScreen';
import AddClientScreen from './src/screens/AddClientScreen';
import ClientDetailScreen from './src/screens/ClientDetailScreen';
import GenerateMealPlanScreen from './src/screens/GenerateMealPlanScreen';
import ProgressRecordScreen from './src/screens/ProgressRecordScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';

import IngredientsLibraryScreen from './src/screens/IngredientsLibraryScreen';
import AddIngredientScreen from './src/screens/AddIngredientScreen';

import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';

import { ClientProvider, useClients } from './src/context/ClientContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AccessGuard } from './src/components/AccessGuard';
import { COLORS } from './src/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const IngredientStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();
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
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: t('attendanceTitle'), headerShown: false }} />
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

function AdminStackScreen() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <AdminStack.Screen name="AdminHome" component={AdminScreen} />
      <AdminStack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <AdminStack.Screen name="AdminIngredients" component={IngredientsLibraryScreen} initialParams={{ showBack: true }} />
      <AdminStack.Screen name="AddIngredient" component={AddIngredientScreen} />
    </AdminStack.Navigator>
  );
}

function MainApp() {
  const { t, isAdmin } = useClients();
  return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof Ionicons.glyphMap = 'people';
                if (route.name === 'Clients L') iconName = focused ? 'people' : 'people-outline';
                else if (route.name === 'Ingredients') iconName = focused ? 'restaurant' : 'restaurant-outline';
                else if (route.name === 'Subscription') iconName = focused ? 'card' : 'card-outline';
                else if (route.name === 'Admin') iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
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
        <Tab.Screen name="Subscription" component={SubscriptionScreen} options={{ title: t('subscription') }} />
        {isAdmin && <Tab.Screen name="Admin" component={AdminStackScreen} options={{ title: 'Admin' }} />}
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabSettings') }}/>
      </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{...DarkTheme, colors: {...DarkTheme.colors, background: COLORS.background}}}>
      <ClientProvider>
        {user ? (
          <AccessGuard>
            <MainApp />
          </AccessGuard>
        ) : (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="SignUp" component={SignUpScreen} />
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </AuthStack.Navigator>
        )}
      </ClientProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
