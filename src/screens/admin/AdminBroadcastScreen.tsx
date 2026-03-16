import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayDate } from '../../utils/dateFormat';
import {
  BroadcastMessage,
  getBroadcastMessages,
  sendBroadcastMessage,
} from '../../services/broadcastService';

export default function AdminBroadcastScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      setMessages(await getBroadcastMessages());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [])
  );

  const handleSend = async () => {
    const nextTitle = title.trim();
    const nextBody = body.trim();

    if (!nextTitle || !nextBody || !user) {
      Alert.alert('שגיאה', 'יש להזין כותרת ותוכן להודעה.');
      return;
    }

    try {
      setSending(true);
      const recipientCount = await sendBroadcastMessage(nextTitle, nextBody, user.uid);
      setTitle('');
      setBody('');
      await load(false);
      Alert.alert('נשלח', `ההודעה נשלחה ל-${recipientCount} משתמשים.`);
    } catch (error) {
      console.error('Failed to send broadcast message', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח את ההודעה.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הודעות</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
              tintColor="#c9a84c"
            />
          }
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>שלח הודעה לכל המשתמשים</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="כותרת"
              placeholderTextColor="#666"
              textAlign="right"
            />
            <TextInput
              style={[styles.input, styles.bodyInput]}
              value={body}
              onChangeText={setBody}
              placeholder="תוכן ההודעה"
              placeholderTextColor="#666"
              multiline
              textAlign="right"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
              {sending ? (
                <ActivityIndicator size="small" color="#1a1a2e" />
              ) : (
                <Text style={styles.sendButtonText}>שלח לכולם</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>הודעות שנשלחו</Text>
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>עדיין לא נשלחו הודעות מערכת.</Text>
            ) : (
              messages.map((message) => {
                const sentDate =
                  message.sentAt?.toDate?.() instanceof Date
                    ? message.sentAt.toDate()
                    : null;

                return (
                  <View key={message.id} style={styles.messageCard}>
                    <Text style={styles.messageTitle}>{message.title}</Text>
                    <Text style={styles.messageBody}>{message.body}</Text>
                    <Text style={styles.messageMeta}>
                      נשלח ל-{message.recipientCount} משתמשים
                      {sentDate ? ` • ${formatDisplayDate(sentDate.toISOString().slice(0, 10))}` : ''}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  content: { padding: 14 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  bodyInput: { minHeight: 120, textAlignVertical: 'top' },
  sendButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  sendButtonText: { color: '#1a1a2e', fontSize: 15, fontWeight: 'bold' },
  emptyText: { color: '#888', fontSize: 14 },
  messageCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 10,
  },
  messageTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  messageBody: { color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  messageMeta: { color: '#888', fontSize: 12 },
});
