import { router } from "expo-router";
import { ChevronLeft, ChevronRight, Search, Type } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { useBibleChapter } from "@/api/queries";
import { QueryState, Segmented } from "@/components/controls";
import { Tag } from "@/components/ui";
import { neighbour, useBibleBooks } from "@/features/bible/books";
import {
  parallelFor,
  PRIMARY_TRANSLATION,
  useReader,
} from "@/features/bible/store";
import { useSettings } from "@/store/settings";
import { useUserData } from "@/store/userData";
import { color, font, hit, icon, tracking, type } from "@/theme";

const LANG_NAME: Record<string, string> = { SUV: "Kiswahili", KJV: "English" };

/** Screen 1e — Bible reader. */
export default function BibleScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uiLang, textScale, set: setSettings } = useSettings();
  const { book, chapter, parallelOn, goTo, setParallel } = useReader();
  const translation = PRIMARY_TRANSLATION[uiLang] ?? "SUV";
  const parallel = parallelFor(translation);

  const books = useBibleBooks(translation);
  const q = useBibleChapter(
    translation,
    book,
    chapter,
    parallelOn ? parallel : null,
  );
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  const bookName =
    books.data?.find((b) => b.osis === book)?.name ?? q.data?.book_name ?? book;

  const [selected, setSelected] = useState<number[]>([]);
  const marks = useUserData((s) => s.marks);
  const putMark = useUserData((s) => s.putMark);
  const removeMark = useUserData((s) => s.removeMark);

  // Live highlights for this chapter, keyed by OSIS ref.
  const highlights = useMemo(() => {
    const prefix = `${book}.${chapter}.`;
    const m = new Map<string, string>();
    for (const mk of Object.values(marks))
      if (
        mk.kind === "highlight" &&
        mk.target === "verse" &&
        !mk.deleted_at &&
        mk.target_ref.startsWith(prefix)
      )
        m.set(mk.target_ref, mk.id);
    return m;
  }, [marks, book, chapter]);

  const verses = q.data?.verses ?? [];
  const selRefs = verses
    .filter((v) => selected.includes(v.verse))
    .map((v) => v.osis_ref);
  const allHighlighted =
    selRefs.length > 0 && selRefs.every((r) => highlights.has(r));
  const lastSelected = selected.length ? Math.max(...selected) : null;

  const go = (dir: 1 | -1) => {
    const n = neighbour(books.data, book, chapter, dir);
    if (n) {
      setSelected([]);
      goTo(n.book, n.chapter);
    }
  };

  const toggleHighlight = () => {
    for (const ref of selRefs) {
      const id = highlights.get(ref);
      if (allHighlighted && id) removeMark(id);
      else if (!id)
        putMark({
          kind: "highlight",
          target: "verse",
          target_ref: ref,
          color: "accent",
        });
    }
    setSelected([]);
  };

  const share = () => {
    const text = verses
      .filter((v) => selected.includes(v.verse))
      .map((v) => `${v.verse} ${v.text}`)
      .join("\n");
    const range =
      selected.length > 1
        ? `${Math.min(...selected)}–${Math.max(...selected)}`
        : String(selected[0]);
    void Share.share({
      message: `${text}\n— ${bookName} ${chapter}:${range} (${translation})`,
    });
  };

  const verseSize = type.verse * textScale;
  const cycleTextSize = () =>
    setSettings({
      textScale:
        textScale >= 1.75 ? 1 : Math.round((textScale + 0.25) * 100) / 100,
    });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("bible.books")}
          onPress={() => router.push("/bible-books")}
          style={styles.titleBtn}
        >
          <Text style={styles.title} numberOfLines={1}>
            {bookName} {chapter}
          </Text>
        </Pressable>
        <Tag label={translation} variant="outline" />
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.textSize")}
          onPress={cycleTextSize}
          style={styles.iconBtn}
        >
          <Type
            size={icon.rail}
            strokeWidth={icon.strokeWidth}
            color={color.text}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.search")}
          onPress={() => router.push("/search")}
          style={styles.iconBtn}
        >
          <Search
            size={icon.rail}
            strokeWidth={icon.strokeWidth}
            color={color.text}
          />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Segmented
          value={parallelOn ? "par" : "single"}
          onChange={(v) => setParallel(v === "par")}
          options={[
            { value: "single", label: LANG_NAME[translation] ?? translation },
            {
              value: "par",
              label: `${LANG_NAME[translation] ?? translation} + ${LANG_NAME[parallel] ?? parallel}`,
            },
          ]}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <QueryState
          loading={q.isPending}
          error={q.isError && !notFound}
          onRetry={() => q.refetch()}
        />
        {notFound ? (
          <Text style={styles.empty}>{t("bible.noText")}</Text>
        ) : null}
        {verses.map((v) => {
          const sel = selected.includes(v.verse);
          const hl = highlights.has(v.osis_ref);
          return (
            <View
              key={v.osis_ref}
              style={[
                styles.verse,
                (sel || hl) && { backgroundColor: color.accent100 },
                sel && styles.verseSel,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                onPress={() =>
                  setSelected((s) =>
                    s.includes(v.verse)
                      ? s.filter((x) => x !== v.verse)
                      : [...s, v.verse],
                  )
                }
              >
                <Text
                  style={[
                    styles.verseText,
                    { fontSize: verseSize, lineHeight: verseSize * 1.6 },
                  ]}
                  maxFontSizeMultiplier={2}
                >
                  <Text style={styles.verseNum}>{v.verse} </Text>
                  {v.text}
                </Text>
                {parallelOn && v.parallel_text ? (
                  <Text
                    style={[
                      styles.parallel,
                      {
                        fontSize: type.body * textScale,
                        lineHeight: type.body * textScale * 1.5,
                      },
                    ]}
                    maxFontSizeMultiplier={2}
                  >
                    {v.parallel_text}
                  </Text>
                ) : null}
              </Pressable>
              {v.verse === lastSelected ? (
                <View style={styles.actions}>
                  <ActionTag
                    label={
                      allHighlighted
                        ? t("bible.unhighlight")
                        : t("bible.highlight")
                    }
                    onPress={toggleHighlight}
                  />
                  <ActionTag
                    label={t("bible.note")}
                    onPress={() => {
                      router.push({
                        pathname: "/note-edit",
                        params: {
                          target: "verse",
                          ref: v.osis_ref,
                          label: `${bookName} ${chapter}:${v.verse}`,
                        },
                      });
                      setSelected([]);
                    }}
                  />
                  <ActionTag label={t("bible.share")} onPress={share} />
                  <ActionTag
                    outline
                    label={t("bible.findEgw")}
                    onPress={() =>
                      router.push({
                        pathname: "/search",
                        params: {
                          q: `${bookName} ${chapter}:${v.verse}`,
                          scope: "egw",
                        },
                      })
                    }
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("bible.prev")}
          onPress={() => go(-1)}
          style={styles.navBtn}
        >
          <ChevronLeft
            size={icon.rail}
            strokeWidth={icon.strokeWidth}
            color={color.text}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/bible-books")}
          style={{ flex: 1, alignItems: "center" }}
        >
          <Text style={styles.footerText}>
            {bookName} {chapter}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("bible.next")}
          onPress={() => go(1)}
          style={styles.navBtn}
        >
          <ChevronRight
            size={icon.rail}
            strokeWidth={icon.strokeWidth}
            color={color.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

function ActionTag({
  label,
  onPress,
  outline,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
    >
      <Tag label={label} variant={outline ? "outline" : "accent"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 6,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  titleBtn: { minHeight: hit.min, justifyContent: "center", flexShrink: 1 },
  title: { fontFamily: font.heading, fontSize: type.h4, color: color.text },
  iconBtn: {
    width: hit.min,
    height: hit.min,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20, gap: 4 },
  empty: {
    fontFamily: font.body,
    fontSize: type.bodyL,
    color: color.neutral700,
    textAlign: "center",
    padding: 24,
  },
  verse: { paddingVertical: 8, paddingHorizontal: 10, marginHorizontal: -10 },
  verseSel: {
    borderLeftWidth: 2,
    borderLeftColor: color.accent,
    paddingLeft: 8,
  },
  verseText: { fontFamily: font.body, color: color.text },
  verseNum: {
    fontFamily: font.heading,
    fontSize: type.small,
    color: color.accent700,
  },
  parallel: { fontFamily: font.body, color: color.neutral700, marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: color.divider,
    minHeight: 52,
  },
  navBtn: {
    width: hit.min,
    height: hit.min,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontFamily: font.headingRegular,
    fontSize: type.bodyL,
    letterSpacing: tracking(0.08, type.bodyL),
    textTransform: "uppercase",
    color: color.accent700,
  },
});
