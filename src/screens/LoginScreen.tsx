import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';
import { COLORS } from '../constants/theme';
import { useClients } from '../context/ClientContext';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useClients();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', t('pleaseFillAll'));
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor={COLORS.textDim}
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
        
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
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: COLORS.textDim, fontSize: 14 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 16 },
  forgotText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' }
});
