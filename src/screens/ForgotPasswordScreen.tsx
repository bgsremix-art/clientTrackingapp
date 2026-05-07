import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { COLORS } from '../constants/theme';
import { useClients } from '../context/ClientContext';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useClients();

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', t('pleaseFillAll'));
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(t('resetPassword'), t('resetEmailSent'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      
      <Text style={styles.title}>{t('resetPassword')}</Text>
      
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
      </View>

      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>{t('sendResetLink')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
        <Text style={styles.linkText}>{t('backToLogin')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 24 },
  title: { color: COLORS.primary, fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  inputContainer: { marginBottom: 24 },
  input: { backgroundColor: COLORS.surface, color: COLORS.text, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: COLORS.textDim, fontSize: 14 }
});
