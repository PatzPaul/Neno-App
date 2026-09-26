import { useNetworkState } from 'expo-network';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, type } from '@/theme';

/** "Hakuna mtandao" band shown over the top of the app while offline. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const net = useNetworkState();
  // isInternetReachable is null while unknown; only show once we know we're offline.
  const offline = net.isConnected === false || net.isInternetReachable === false;
  if (!offline) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.band, { paddingTop: insets.top + 4 }]}>
      <Text style={styles.text}>{t('common.offline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.accent900, paddingBottom: 6, paddingHorizontal: 16 },
  text: { fontFamily: font.body, fontSize: type.caption, color: color.accent100, textAlign: 'center' },
});
