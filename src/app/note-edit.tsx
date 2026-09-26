import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Schemas } from '@/api/client';
import { ScreenHeader } from '@/components/controls';
import { PrimaryButton } from '@/components/ui';
import { findLiveMark, useUserData } from '@/store/userData';
import { color, font, space, type } from '@/theme';

/** Create or edit the note attached to a verse / paragraph. Params: target, ref, label. */
export default function NoteEditScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { target, ref, label } = useLocalSearchParams<{ target: Schemas['TargetKind']; ref: string; label?: string }>();
  const existing = useUserData((s) => findLiveMark(s.marks, 'note', target, ref));
  const putMark = useUserData((s) => s.putMark);
  const removeMark = useUserData((s) => s.removeMark);
  const [text, setText] = useState(existing?.note ?? '');

  const save = () => {
    const note = text.trim();
    if (note) putMark({ id: existing?.id, kind: 'note', target, target_ref: ref, note });
    else if (existing) removeMark(existing.id);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('bible.noteTitle')} subtitle={label ?? ref} />
      <View style={{ flex: 1, padding: space.screen, gap: 16, paddingBottom: insets.bottom + 16 }}>
        <TextInput
          autoFocus
          multiline
          value={text}
          onChangeText={setText}
          placeholder={t('bible.notePlaceholder')}
          placeholderTextColor={color.neutral500}
          style={styles.input}
          textAlignVertical="top"
        />
        <PrimaryButton label={t('common.save')} onPress={save} size="lg" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  input: {
    flex: 1, backgroundColor: color.surface, borderWidth: 1, borderColor: color.divider, padding: 12,
    fontFamily: font.body, fontSize: type.bodyL, lineHeight: type.bodyL * 1.5, color: color.text,
  },
});
