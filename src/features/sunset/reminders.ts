import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/i18n';

import type { City } from './store';
import { formatTime, nextFridays } from './sun';

const CHANNEL = 'sabbath';
const WEEKS = 4;
const LEAD_MS = 60 * 60_000;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function cancelReminders(ids: string[]) {
  if (Platform.OS === 'web') return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/**
 * Schedules a local notification 60 min before each of the next four Friday sunsets (computed on device).
 * Returns the new ids, or null when notification permission is denied. Works offline and in Expo Go.
 */
export async function scheduleReminders(city: City, previous: string[]): Promise<string[] | null> {
  if (Platform.OS === 'web') return [];
  const perm = await Notifications.getPermissionsAsync();
  const granted = perm.granted || (perm.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: i18n.t('sunset.title'),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await cancelReminders(previous);
  const now = new Date();
  const ids: string[] = [];
  for (const f of nextFridays(now, city, WEEKS)) {
    const at = new Date(f.sunset.getTime() - LEAD_MS);
    if (at <= now) continue;
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('sunset.notifTitle'),
          body: i18n.t('sunset.notifBody', { time: formatTime(f.sunset, city.tz), city: city.name }),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      }),
    );
  }
  return ids;
}
