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
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { loginWithEmail, loginWithGoogle } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: any) {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '288101421313-6esnmfcn3f843jo2sh3fj12qs4e0o8ar.apps.googleusercontent.com',
    iosClientId: '288101421313-6esnmfcn3f843jo2sh3fj12qs4e0o8ar.apps.googleusercontent.com',
    webClientId: '288101421313-j6q23j0k2lshdi1i0a3u9e2ri92qgjp8.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const showDisabledMessage = () => {
    Alert.alert('החשבון מושבת', 'מנהל המערכת השבית את החשבון הזה. פנה למנהל כדי להפעיל אותו מחדש.');
  };

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const profile = await loginWithGoogle(idToken);
      setUser(profile);
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_DISABLED') {
        showDisabledMessage();
      } else {
        Alert.alert('שגיאה', 'כניסה עם Google נכשלה');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (isExpoGo) {
      Alert.alert(
        'Google login לא זמין ב-Expo Go',
        'כדי להתחבר עם Google צריך Development Build ו-Client IDs נפרדים ל-iOS, Android ו-Web ב-Google Cloud/Firebase.'
      );
      return;
    }

    await promptAsync();
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'יש למלא מייל וסיסמה');
      return;
    }

    setLoading(true);
    try {
      const profile = await loginWithEmail(email, password);
      setUser(profile);
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_DISABLED') {
        showDisabledMessage();
      } else {
        Alert.alert('שגיאה', 'מייל או סיסמה שגויים');
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
      <View style={styles.inner}>
        <Ionicons name="cut" size={64} color="#c9a84c" style={styles.logo} />
        <Text style={styles.title}>ברוך הבא</Text>
        <Text style={styles.subtitle}>קביעת תורים לספר</Text>

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
          placeholder="סיסמה"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />

        <TouchableOpacity style={styles.button} onPress={handleEmailLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.buttonText}>כניסה</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>או</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGooglePress}
          disabled={!request || loading}
        >
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.googleText}>המשך עם Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>אין לך חשבון? הירשם כאן</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#c9a84c', textAlign: 'center', marginBottom: 32 },
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
    marginTop: 4,
  },
  buttonText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#333' },
  orText: { color: '#888', marginHorizontal: 12 },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  googleText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#c9a84c', textAlign: 'center', fontSize: 14 },
});
