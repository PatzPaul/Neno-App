import type { Schemas } from '@/api/client';

// OSIS/USFM book codes in canonical order with Swahili (SUV) and English names — reference data for labels
// only; verse text always comes from the licensed translation.
const BOOKS: [string, string, string][] = [
  ['GEN', 'Mwanzo', 'Genesis'], ['EXO', 'Kutoka', 'Exodus'], ['LEV', 'Mambo ya Walawi', 'Leviticus'],
  ['NUM', 'Hesabu', 'Numbers'], ['DEU', 'Kumbukumbu la Torati', 'Deuteronomy'], ['JOS', 'Yoshua', 'Joshua'],
  ['JDG', 'Waamuzi', 'Judges'], ['RUT', 'Ruthu', 'Ruth'], ['1SA', '1 Samweli', '1 Samuel'], ['2SA', '2 Samweli', '2 Samuel'],
  ['1KI', '1 Wafalme', '1 Kings'], ['2KI', '2 Wafalme', '2 Kings'], ['1CH', '1 Mambo ya Nyakati', '1 Chronicles'],
  ['2CH', '2 Mambo ya Nyakati', '2 Chronicles'], ['EZR', 'Ezra', 'Ezra'], ['NEH', 'Nehemia', 'Nehemiah'],
  ['EST', 'Esta', 'Esther'], ['JOB', 'Ayubu', 'Job'], ['PSA', 'Zaburi', 'Psalms'], ['PRO', 'Mithali', 'Proverbs'],
  ['ECC', 'Mhubiri', 'Ecclesiastes'], ['SNG', 'Wimbo Ulio Bora', 'Song of Songs'], ['ISA', 'Isaya', 'Isaiah'],
  ['JER', 'Yeremia', 'Jeremiah'], ['LAM', 'Maombolezo', 'Lamentations'], ['EZK', 'Ezekieli', 'Ezekiel'],
  ['DAN', 'Danieli', 'Daniel'], ['HOS', 'Hosea', 'Hosea'], ['JOL', 'Yoeli', 'Joel'], ['AMO', 'Amosi', 'Amos'],
  ['OBA', 'Obadia', 'Obadiah'], ['JON', 'Yona', 'Jonah'], ['MIC', 'Mika', 'Micah'], ['NAM', 'Nahumu', 'Nahum'],
  ['HAB', 'Habakuki', 'Habakkuk'], ['ZEP', 'Sefania', 'Zephaniah'], ['HAG', 'Hagai', 'Haggai'],
  ['ZEC', 'Zekaria', 'Zechariah'], ['MAL', 'Malaki', 'Malachi'], ['MAT', 'Mathayo', 'Matthew'], ['MRK', 'Marko', 'Mark'],
  ['LUK', 'Luka', 'Luke'], ['JHN', 'Yohana', 'John'], ['ACT', 'Matendo ya Mitume', 'Acts'], ['ROM', 'Warumi', 'Romans'],
  ['1CO', '1 Wakorintho', '1 Corinthians'], ['2CO', '2 Wakorintho', '2 Corinthians'], ['GAL', 'Wagalatia', 'Galatians'],
  ['EPH', 'Waefeso', 'Ephesians'], ['PHP', 'Wafilipi', 'Philippians'], ['COL', 'Wakolosai', 'Colossians'],
  ['1TH', '1 Wathesalonike', '1 Thessalonians'], ['2TH', '2 Wathesalonike', '2 Thessalonians'],
  ['1TI', '1 Timotheo', '1 Timothy'], ['2TI', '2 Timotheo', '2 Timothy'], ['TIT', 'Tito', 'Titus'],
  ['PHM', 'Filemoni', 'Philemon'], ['HEB', 'Waebrania', 'Hebrews'], ['JAS', 'Yakobo', 'James'], ['1PE', '1 Petro', '1 Peter'],
  ['2PE', '2 Petro', '2 Peter'], ['1JN', '1 Yohana', '1 John'], ['2JN', '2 Yohana', '2 John'], ['3JN', '3 Yohana', '3 John'],
  ['JUD', 'Yuda', 'Jude'], ['REV', 'Ufunuo', 'Revelation'],
];
const NAMES = new Map(BOOKS.map(([osis, sw, en]) => [osis, { sw, en }]));

export function bookName(osis: string, lang: string): string {
  const n = NAMES.get(osis.toUpperCase());
  if (!n) return osis;
  return lang === 'sw' ? n.sw : n.en; // French editions fall back to English book names for now
}

/** Parses "JHN.3.16" (also "JHN.3.16-18") into its parts. */
export function parseOsis(ref: string): { book: string; chapter: number; verse?: number; verseEnd?: number } | null {
  const m = /^([1-3]?[A-Z]{2,3})\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/i.exec(ref.trim());
  if (!m) return null;
  return { book: m[1].toUpperCase(), chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : undefined, verseEnd: m[4] ? Number(m[4]) : undefined };
}

/** "JHN.3.16" → "Yohana 3:16". */
export function formatOsis(ref: string, lang: string): string {
  const p = parseOsis(ref);
  if (!p) return ref;
  const v = p.verse ? `:${p.verse}${p.verseEnd ? `–${p.verseEnd}` : ''}` : '';
  return `${bookName(p.book, lang)} ${p.chapter}${v}`;
}

type Target = Schemas['TargetKind'];

/** Human label for any mark target; `t` resolves the notes.* strings. */
export function formatTarget(target: Target, ref: string, lang: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  switch (target) {
    case 'verse':
      return formatOsis(ref, lang);
    case 'hymn': {
      const [code, n] = ref.split('/');
      return n ? `${code} ${n}` : ref;
    }
    case 'belief':
      return t('notes.belief', { n: ref });
    case 'feed_item':
      return t('notes.feedItem');
    case 'ss_day':
      return t('notes.ssDay');
    case 'course_lesson':
      return t('notes.lesson');
    default:
      return ref;
  }
}
