import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Pack } from '@/api/client';
import { formatBytes, usePacks } from '@/api/queries';
import { QueryState, ScreenHeader } from '@/components/controls';
import { PrimaryButton, SecondaryButton } from '@/components/ui';
import { downloadPack, packsSupported, removePack } from '@/packs/manager';
import { usePacksStore } from '@/packs/store';
import { useSettings } from '@/store/settings';
import { color, font, space, type } from '@/theme';

/** Offline packs: download, update, remove. */
export default function DownloadsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uiLang, packs: wanted, set } = useSettings();
  const manifest = usePacks(uiLang);
  const installed = usePacksStore((s) => s.installed);
  const used = Object.values(installed).reduce((n, p) => n + p.bytes, 0);

  const want = (slug: string, on: boolean) => set({ packs: on ? Array.from(new Set([...wanted, slug])) : wanted.filter((s) => s !== slug) });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('downloads.title')} subtitle={used ? t('downloads.used', { size: formatBytes(used) }) : undefined} />
      <ScrollView contentContainerStyle={{ padding: space.screen, gap: 14, paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.intro}>{packsSupported ? t('downloads.intro') : t('downloads.webOnly')}</Text>
        <QueryState loading={manifest.isPending} error={manifest.isError} empty={manifest.data?.length === 0} onRetry={() => manifest.refetch()} />
        {packsSupported
          ? manifest.data?.map((p) => (
              <PackRow
                key={p.slug}
                pack={p}
                onDownload={() => {
                  want(p.slug, true);
                  void downloadPack(p).catch(() => {});
                }}
                onRemove={() => {
                  want(p.slug, false);
                  removePack(p.slug);
                }}
              />
            ))
          : null}
      </ScrollView>
    </View>
  );
}

function PackRow({ pack, onDownload, onRemove }: { pack: Pack; onDownload: () => void; onRemove: () => void }) {
  const { t } = useTranslation();
  const inst = usePacksStore((s) => s.installed[pack.slug]);
  const status = usePacksStore((s) => s.status[pack.slug]);
  const outdated = !!inst && inst.version < pack.version;
  const busy = status?.state === 'downloading';

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name}>{t(`packs.${pack.slug}`, { defaultValue: pack.slug })}</Text>
        <Text style={[styles.meta, status?.state === 'error' && { color: color.accent800 }]}>
          {busy
            ? `${Math.round(status.progress * 100)}% · ${formatBytes(pack.bytes)}`
            : status?.state === 'error'
              ? t('downloads.failed')
              : inst && !outdated
                ? `${t('downloads.ready')} · v${inst.version} · ${formatBytes(inst.bytes)}`
                : `v${pack.version} · ${formatBytes(pack.bytes)}`}
        </Text>
        {busy ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(status.progress * 100)}%` }]} />
          </View>
        ) : null}
      </View>
      {inst && !outdated ? (
        <SecondaryButton label={t('downloads.remove')} onPress={onRemove} />
      ) : (
        <PrimaryButton label={outdated ? t('downloads.update') : t('downloads.download')} disabled={busy} onPress={onDownload} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  intro: { fontFamily: font.body, fontSize: type.body, lineHeight: type.body * 1.5, color: color.neutral700 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.divider },
  name: { fontFamily: font.bodyMedium, fontSize: type.bodyL, color: color.text },
  meta: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  track: { height: 2, backgroundColor: color.neutral300, marginTop: 4 },
  fill: { height: 2, backgroundColor: color.accent },
});
