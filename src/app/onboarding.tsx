import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatBytes, usePacks } from '@/api/queries';
import { PrimaryButton } from '@/components/ui';
import i18n, { UI_LANGS, type UiLang } from '@/i18n';
import { useSettings } from '@/store/settings';
import { color, font, tracking, type } from '@/theme';

/** Screen 1d — step 1 of 3. Steps 2–3 (translation, sunset location) are not designed yet. */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const set = useSettings((s) => s.set);
  const [lang, setLang] = useState<UiLang>(useSettings.getState().uiLang);
  const packs = usePacks(lang);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const pickLang = (l: UiLang) => {
    setLang(l);
    i18n.changeLanguage(l); // preview the UI in the chosen language
  };
  const isPicked = (slug: string) => picked[slug] ?? true; // all packs pre-checked, as in the design

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>NENO</Text>
          <Text style={styles.step}>{t('onboarding.step', { n: 1, total: 3 })}</Text>
        </View>
        <Text style={styles.h1} accessibilityRole="header">
          {t('onboarding.title')}
        </Text>
        <Text style={styles.sub}>{t('onboarding.subtitle')}</Text>

        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {UI_LANGS.map((l) => {
            const on = lang === l;
            return (
              <Pressable
                key={l}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => pickLang(l)}
                style={[styles.langRow, on && styles.langRowOn]}>
                <View style={[styles.radio, { borderColor: on ? color.accent : color.divider }]}>
                  {on ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langName}>{t(`langs.${l}.name`)}</Text>
                  <Text style={styles.langSub}>{t(`langs.${l}.sub`)}</Text>
                </View>
                {l === 'sw' ? <Text style={styles.langTag}>{t('onboarding.default')}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {packs.data?.length ? (
          <>
            <Text style={styles.section}>{t('onboarding.packs')}</Text>
            {packs.data.map((p) => {
              const on = isPicked(p.slug);
              return (
                <Pressable
                  key={p.slug}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => setPicked((s) => ({ ...s, [p.slug]: !on }))}
                  style={styles.packRow}>
                  <View style={styles.checkbox}>{on ? <Check size={14} strokeWidth={1.5} color={color.accent} /> : null}</View>
                  <Text style={styles.packName}>{t(`packs.${p.slug}`, { defaultValue: p.slug })}</Text>
                  <Text style={styles.packSize}>{formatBytes(p.bytes)}</Text>
                </Pressable>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      <PrimaryButton
        size="lg"
        label={t('onboarding.continue')}
        onPress={() =>
          set({
            uiLang: lang,
            parallelLang: lang === 'en' ? 'sw' : 'en',
            packs: (packs.data ?? []).filter((p) => isPicked(p.slug)).map((p) => p.slug),
            onboarded: true,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: 20 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, paddingBottom: 28 },
  wordmark: { fontFamily: font.heading, fontSize: 24, letterSpacing: tracking(0.12, 24), color: color.text },
  step: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  h1: { fontFamily: font.heading, fontSize: type.h1, lineHeight: type.h1 * 1.12, letterSpacing: tracking(-0.015, type.h1), color: color.text },
  sub: { fontFamily: font.body, fontSize: type.bodyL, color: color.neutral700, marginTop: 6, marginBottom: 20 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, borderWidth: 1, borderColor: color.divider },
  langRowOn: { backgroundColor: color.accent100, borderColor: color.accent },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent },
  langName: { fontFamily: font.heading, fontSize: type.h6, color: color.text },
  langSub: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  langTag: { fontFamily: font.body, fontSize: type.label, color: color.neutral600 },
  section: {
    fontFamily: font.body, fontSize: type.label, letterSpacing: tracking(0.1, type.label), textTransform: 'uppercase',
    color: color.neutral600, marginTop: 24, marginBottom: 6,
  },
  packRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderTopWidth: 1, borderTopColor: color.divider },
  checkbox: { width: 18, height: 18, borderWidth: 1.5, borderColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  packName: { flex: 1, fontFamily: font.body, fontSize: type.body, color: color.text },
  packSize: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
});
