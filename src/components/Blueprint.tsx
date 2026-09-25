import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, cornerMark } from '@/theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Hairline divider border; off for solid objects like the primary button. */
  bordered?: boolean;
};

/** Blueprint frame: hairline border + four "+" registration marks just outside the corners. */
export function Blueprint({ children, style, bordered = true }: Props) {
  return (
    <View style={[bordered && styles.border, style]}>
      {children}
      <Mark style={{ top: cornerMark.offset, left: cornerMark.offset }} />
      <Mark style={{ top: cornerMark.offset, right: cornerMark.offset }} />
      <Mark style={{ bottom: cornerMark.offset, left: cornerMark.offset }} />
      <Mark style={{ bottom: cornerMark.offset, right: cornerMark.offset }} />
    </View>
  );
}

function Mark({ style }: { style: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[styles.mark, style]}>
      <View style={styles.v} />
      <View style={styles.h} />
    </View>
  );
}

const half = (cornerMark.size - cornerMark.stroke) / 2;

const styles = StyleSheet.create({
  border: { borderWidth: StyleSheet.hairlineWidth, borderColor: color.divider },
  mark: { position: 'absolute', width: cornerMark.size, height: cornerMark.size },
  v: { position: 'absolute', left: half, top: 0, width: cornerMark.stroke, height: cornerMark.size, backgroundColor: cornerMark.color },
  h: { position: 'absolute', top: half, left: 0, height: cornerMark.stroke, width: cornerMark.size, backgroundColor: cornerMark.color },
});
