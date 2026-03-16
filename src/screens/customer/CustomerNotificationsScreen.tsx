import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  BroadcastMessage,
  getBroadcastMessages,
  getLastSeenBroadcastAt,
  markBroadcastsAsSeen,
} from '../../services/broadcastService';
import { formatDisplayDate } from '../../utils/dateFormat';

export default function CustomerNotificationsScreen() {
  const { user } = useAuth();
  const [newMessages, setNewMessages] = useState<BroadcastMessage[]>([]);
  const [historyMessages, setHistoryMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showLoader = false) => {
    if (!user) return;
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [messages, lastSeenAt] = await Promise.all([
        getBroadcastMessages(),
        getLastSeenBroadcastAt(user.uid),
      ]);

      const unread: BroadcastMessage[] = [];
      const history: BroadcastMessage[] = [];

      messages.forEach((message) => {
        const sentAt = message.sentAt?.toDate?.() instanceof Date ? message.sentAt.toDate() : null;
        if (sentAt && lastSeenAt && sentAt > lastSeenAt) {
          unread.push(message);
        } else if (sentAt && !lastSeenAt) {
          unread.push(message);
        } else {
          history.push(message);
        }
      });

      setNewMessages(unread);
      setHistoryMessages(history);
      await markBroadcastsAsSeen(user.uid);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [user?.uid])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c9a84c" />
      </View>
    );
  }

  const renderMessage = (message: BroadcastMessage, isNew: boolean) => {
    const sentAt = message.sentAt?.toDate?.() instanceof Date ? message.sentAt.toDate() : null;
    const sentDate = sentAt ? formatDisplayDate(sentAt.toISOString().slice(0, 10)) : '';
    const sentTime = sentAt
      ? `${String(sentAt.getHours()).padStart(2, '0')}:${String(sentAt.getMinutes()).padStart(2, '0')}`
      : '';

    return (
      <View key={message.id} style={[styles.card, isNew && styles.cardNew]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{message.title}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>חדש</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardBody}>{message.body}</Text>
        <Text style={styles.cardMeta}>
          {sentDate}
          {sentTime ? ` • ${sentTime}` : ''}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>התראות</Text>
      </View>

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
        {newMessages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>חדשות</Text>
            {newMessages.map((message) => renderMessage(message, true))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>היסטוריה</Text>
          {historyMessages.length === 0 && newMessages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={52} color="#444" />
              <Text style={styles.emptyText}>אין עדיין התראות להצגה.</Text>
            </View>
          ) : historyMessages.length === 0 ? (
            <Text style={styles.emptyHistory}>כל ההתראות האחרונות כבר מופיעות מעל.</Text>
          ) : (
            historyMessages.map((message) => renderMessage(message, false))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#c9a84c', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardNew: { borderColor: '#c9a84c', backgroundColor: '#c9a84c11' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 10 },
  cardBody: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  cardMeta: { color: '#888', fontSize: 12, marginTop: 10 },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#c9a84c',
  },
  newBadgeText: { color: '#1a1a2e', fontSize: 11, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#666', marginTop: 10, fontSize: 14 },
  emptyHistory: { color: '#888', fontSize: 14 },
});
