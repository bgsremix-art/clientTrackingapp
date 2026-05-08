import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import { COLORS } from '../constants/theme';
import { useClients } from '../context/ClientContext';

const REMEMBERED_EMAIL_KEY = 'remembered_login_email';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const { t } = useClients();

  useEffect(() => {
    AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).then((savedEmail) => {
      if (savedEmail) setEmail(savedEmail);
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', t('pleaseFillAll'));
      return;
    }
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (rememberEmail) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, cleanEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert(
          t('verifyEmailTitle'),
          t('emailUnverified'),
          [
            { text: t('close'), style: 'cancel' },
            { 
              text: t('resendEmail'), 
              onPress: async () => {
                await sendEmailVerification(user);
                Alert.alert(t('verifyEmailTitle'), t('verificationEmailSent'));
              }
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          placeholderTextColor={COLORS.textDim}
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor={COLORS.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(prev => !prev)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberEmail(prev => !prev)} activeOpacity={0.85}>
          <View style={[styles.checkbox, rememberEmail && styles.checkboxActive]}>
            {rememberEmail && <Ionicons name="checkmark" size={14} color="#000" />}
          </View>
          <Text style={styles.rememberText}>Remember email</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Log In</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.linkButton}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  title: { color: COLORS.primary, fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  inputContainer: { marginBottom: 24 },
  input: { backgroundColor: COLORS.surface, color: COLORS.text, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, width: 40, height: 52, alignItems: 'center', justifyContent: 'center' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: -4, marginBottom: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rememberText: { color: COLORS.textDim, fontSize: 14 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: COLORS.textDim, fontSize: 14 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 16 },
  forgotText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' }
});
