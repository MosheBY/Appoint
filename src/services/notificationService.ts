import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) return null;
    if (Constants.executionEnvironment === 'storeClient') return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    const isValidProjectId =
      typeof projectId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId);
    const token = (await Notifications.getExpoPushTokenAsync(
      isValidProjectId ? { projectId } : {}
    )).data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c9a84c',
      });
    }

    return token;
  } catch (error) {
    console.warn('Push notification registration skipped');
    return null;
  }
};

export const sendPushNotification = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: object
): Promise<void> => {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: expoPushToken, title, body, data: data ?? {} }),
  });
};

export const scheduleLocalReminder = async (
  appointmentId: string,
  date: string,
  time: string,
  serviceName: string
): Promise<string> => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const appointmentDate = new Date(year, month - 1, day, hour, minute);
  const reminderDate = new Date(appointmentDate.getTime() - 60 * 60 * 1000);

  if (reminderDate <= new Date()) return '';

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'תזכורת תור!',
      body: `יש לך תור ל${serviceName} בעוד שעה (${time})`,
      data: { appointmentId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  return id;
};

export const cancelScheduledReminder = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};
