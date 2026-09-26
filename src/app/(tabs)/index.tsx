import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FeedItem } from '@/api/client';
import { useFeed } from '@/api/queries';
import { PrimaryButton } from '@/components/ui';
import { FeedItemView } from '@/features/feed/FeedItemView';
import { useSettings } from '@/store/settings';
import { color, font, icon, type } from '@/theme';

export default function FeedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uiLang, parallelLang, dataSaver, set } = useSettings();
  const feed = useFeed(uiLang);
  const [height, setHeight] = useState(0);

  const items = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);
  const showParallel = parallelLang !== null;

  const renderItem = useCallback<ListRenderItem<FeedItem>>(
    ({ item }) => <FeedItemView item={item} height={height} showParallel={showParallel} dataSaver={dataSaver} />,
    [height, showParallel, dataSaver],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.pager} onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}>
        {height > 0 && items.length > 0 ? (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
            pagingEnabled
            disableIntervalMomentum
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            // ±2 items around the visible one
            windowSize={5}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            onEndReachedThreshold={2}
            onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
            refreshing={feed.isRefetching}
            onRefresh={() => feed.refetch()}
          />
        ) : feed.isPending ? (
          <Skeleton />
        ) : (
          <View style={styles.center}>
            <Text style={styles.message}>{feed.isError ? t('feed.loadError') : t('feed.empty')}</Text>
            {feed.isError ? <PrimaryButton label={t('feed.retry')} onPress={() => feed.refetch()} /> : null}
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.headerActive}>{t('feed.forYou')}</Text>
          <Text style={styles.headerIdle}>{t('feed.following')}</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={t('feed.parallelToggle')}
            accessibilityState={{ checked: showParallel }}
            hitSlop={12}
            onPress={() => set({ parallelLang: showParallel ? null : uiLang === 'en' ? 'sw' : 'en' })}
            style={[styles.langChip, showParallel && styles.langChipOn]}>
            <Text style={[styles.langChipText, showParallel && { color: color.accent700 }]}>
              {uiLang.toUpperCase()}
              {showParallel ? ` + ${parallelLang!.toUpperCase()}` : ''}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('feed.search')} onPress={() => router.push('/search')} style={styles.headerIcon}>
            <Search size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Skeleton() {
  return (
    <View style={[styles.center, { alignItems: 'stretch', paddingLeft: 20, paddingRight: 72 }]}>
      {[40, 100, 90, 70, 30].map((w, i) => (
        <View key={i} style={{ height: i === 0 ? 14 : 26, width: `${w}%`, backgroundColor: color.neutral200, marginBottom: 12 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  pager: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 },
  message: { fontFamily: font.body, fontSize: type.bodyL, color: color.neutral700, textAlign: 'center' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(242,242,243,0.92)',
  },
  headerActive: { fontFamily: font.heading, fontSize: 17, color: color.text, borderBottomWidth: 2, borderBottomColor: color.accent, paddingBottom: 2 },
  headerIdle: { fontFamily: font.headingRegular, fontSize: 17, color: color.neutral600 },
  langChip: { marginLeft: 'auto', borderWidth: 1, borderColor: color.divider, paddingVertical: 2, paddingHorizontal: 6 },
  langChipOn: { borderColor: color.accent },
  langChipText: { fontFamily: font.body, fontSize: 11, color: color.text },
  headerIcon: { width: 44, height: 44, marginVertical: -8, alignItems: 'center', justifyContent: 'center' },
});
