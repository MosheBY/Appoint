import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerWithEmail } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('שגיאה', 'יש למלא שם, מייל, טלפון וסיסמה');
      return;
    }

    if (password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);
    try {
      const profile = await registerWithEmail(email, password, name, phone);
      setUser(profile);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('שגיאה', 'המייל הזה כבר רשום');
      } else {
        Alert.alert('שגיאה', 'ההרשמה נכשלה, נסה שוב');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#c9a84c" />
        </TouchableOpacity>

        <Ionicons name="person-add" size={52} color="#c9a84c" style={styles.logo} />
        <Text style={styles.title}>הרשמה</Text>
        <Text style={styles.subtitle}>יצירת חשבון לקוח חדש</Text>

        <TextInput
          style={styles.input}
          placeholder="שם מלא"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          textAlign="right"
        />
        <TextInput
          style={styles.input}
          placeholder="מייל"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textAlign="right"
        />
        <TextInput
          style={styles.input}
          placeholder="טלפון"
          placeholderTextColor="#888"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textAlign="right"
        />
        <TextInput
          style={styles.input}
          placeholder="סיסמה (לפחות 6 תווים)"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.buttonText}>הרשמה</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>כבר יש לך חשבון? התחבר כאן</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  back: { position: 'absolute', top: 50, right: 20 },
  logo: { alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#c9a84c', textAlign: 'center', marginBottom: 28 },
  input: {
    backgroundColor: '#16213e',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#c9a84c', textAlign: 'center', fontSize: 14 },
});
