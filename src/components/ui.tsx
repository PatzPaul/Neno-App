import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { color, font, hit } from '@/theme';

import { Blueprint } from './Blueprint';

type TagVariant = 'accent' | 'neutral' | 'outline';

export function Tag({ label, variant = 'accent' }: { label: string; variant?: TagVariant }) {
  return (
    <View style={[styles.tag, tagStyles[variant]]}>
      <Text style={[styles.tagText, { color: tagText[variant] }]}>{label}</Text>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

/** The only solid object in the system: accent fill, bg text, square, blueprint corner marks. */
export function PrimaryButton({ label, onPress, size = 'md', style, disabled }: ButtonProps) {
  const lg = size === 'lg';
  return (
    <Blueprint bordered={false} style={style}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.btn,
          { minHeight: lg ? 52 : hit.min, backgroundColor: pressed ? color.accent700 : color.accent },
          disabled && { opacity: 0.45 },
        ]}>
        <Text style={[styles.btnText, { fontSize: lg ? 18 : 16 }]}>{label}</Text>
      </Pressable>
    </Blueprint>
  );
}

/** Secondary button: hairline outline, text-tinted press states (7% / 14%). */
export function SecondaryButton({ label, onPress, style, disabled, Icon }: ButtonProps & { Icon?: import('lucide-react-native').LucideIcon }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        styles.secondary,
        { minHeight: hit.min, backgroundColor: pressed ? 'rgba(29,31,32,0.14)' : 'transparent' },
        disabled && { opacity: 0.45 },
        style,
      ]}>
      {Icon ? <Icon size={16} strokeWidth={1.5} color={color.text} /> : null}
      <Text style={[styles.btnText, { fontSize: 16, color: color.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Square 44×26 switch from the Sabbath reminder row. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={9}
      onPress={() => onChange(!value)}
      style={[
        styles.toggle,
        { backgroundColor: value ? color.accent : 'transparent', borderColor: value ? color.accent : color.divider, justifyContent: value ? 'flex-end' : 'flex-start' },
      ]}>
      <View style={[styles.knob, { backgroundColor: value ? color.bg : color.neutral500 }]} />
    </Pressable>
  );
}

/** Media placeholder: diagonal neutral300 hairlines, 1px line / 9px gap. */
export function Stripes({ stroke = color.neutral300 }: { stroke?: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="stripes" patternUnits="userSpaceOnUse" width={10} height={10} patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={10} stroke={stroke} strokeWidth={1} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#stripes)" />
    </Svg>
  );
}

const tagStyles = StyleSheet.create({
  accent: { backgroundColor: color.accent100 },
  neutral: { backgroundColor: color.neutral100 },
  outline: { borderWidth: 1, borderColor: color.accent },
});
const tagText: Record<TagVariant, string> = { accent: color.accent800, neutral: color.neutral800, outline: color.accent700 };

const styles = StyleSheet.create({
  tag: { paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start' },
  tagText: { fontFamily: font.body, fontSize: 11, letterSpacing: 0.22 },
  btn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondary: { flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: color.divider },
  btnText: { fontFamily: font.heading, color: color.bg },
  toggle: { width: 44, height: 26, borderWidth: 1, padding: 3, flexDirection: 'row', alignItems: 'center' },
  knob: { width: 18, height: 18 },
});
