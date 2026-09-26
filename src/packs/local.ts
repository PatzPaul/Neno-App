import type { SQLiteDatabase } from 'expo-sqlite';

import type { Schemas } from '@/api/client';

import { openPack } from './manager';
import { usePacksStore } from './store';

// Read-side of offline packs. Each function returns the same shape as the matching API endpoint, or null
// when the pack isn't installed (callers then fall back to the network).

function meta(db: SQLiteDatabase): Record<string, string> {
  const rows = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM meta');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null; // corrupt or schema-mismatched pack: behave as if not installed
  }
}

export function localBibleBooks(translation: string): Schemas['BibleBook'][] | null {
  const db = openPack(`bible-${translation}`);
  if (!db) return null;
  return safe(() =>
    db.getAllSync<Schemas['BibleBook']>('SELECT osis, ord, testament, name, abbr, chapters FROM books ORDER BY ord'),
  );
}

type VerseRow = { osis_ref: string; verse: number; text: string };

export function localBibleChapter(translation: string, book: string, chapter: number, parallel?: string | null): Schemas['BibleChapter'] | null {
  const db = openPack(`bible-${translation}`);
  if (!db) return null;
  return safe(() => {
    const verses = db.getAllSync<VerseRow>('SELECT osis_ref, verse, text FROM verses WHERE book = ? AND chapter = ? ORDER BY verse', [book, chapter]);
    if (!verses.length) return null;
    const name = db.getFirstSync<{ name: string }>('SELECT name FROM books WHERE osis = ?', [book])?.name;
    const out: Schemas['BibleChapter'] = { translation, book, chapter, book_name: name, verses: verses.map((v) => ({ ...v })) };
    if (parallel) {
      const pdb = openPack(`bible-${parallel}`);
      // Parallel requested but not offline: signal the caller to use the API so both columns stay aligned.
      if (!pdb) return null;
      const pv = pdb.getAllSync<VerseRow>('SELECT verse, text FROM verses WHERE book = ? AND chapter = ?', [book, chapter]);
      const byVerse = new Map(pv.map((v) => [v.verse, v.text]));
      out.parallel = parallel;
      out.verses = out.verses.map((v) => ({ ...v, parallel_text: byVerse.get(v.verse) }));
    }
    return out;
  });
}

/** Installed EGW pack slug for an edition id (packs carry edition_id in meta). */
function egwSlugFor(edition: number): string | null {
  for (const slug of Object.keys(usePacksStore.getState().installed)) {
    if (!slug.startsWith('egw-')) continue;
    const db = openPack(slug);
    if (db && safe(() => meta(db).edition_id) === String(edition)) return slug;
  }
  return null;
}

type ParaRow = { refcode: string; chapter: number; chapter_title: string | null; ord: number; page: number | null; text: string };

export function localEgwChapter(edition: number, n: number, parallelLang?: string | null): Schemas['EgwChapter'] | null {
  const slug = egwSlugFor(edition);
  const db = slug ? openPack(slug) : null;
  if (!db) return null;
  return safe(() => {
    const m = meta(db);
    const rows = db.getAllSync<ParaRow>('SELECT refcode, chapter, chapter_title, ord, page, text FROM paragraphs WHERE chapter = ? ORDER BY ord', [n]);
    if (!rows.length) return null;
    const total = db.getFirstSync<{ n: number }>('SELECT max(chapter) AS n FROM paragraphs')?.n ?? n;
    let parallel: Map<string, string> | null = null;
    if (parallelLang) {
      const pdb = openPack(`egw-${parallelLang}-${m.book_code}`);
      if (!pdb) return null; // fall back to the API for aligned parallel text
      parallel = new Map(pdb.getAllSync<{ refcode: string; text: string }>('SELECT refcode, text FROM paragraphs WHERE chapter = ?', [n]).map((r) => [r.refcode, r.text]));
    }
    return {
      edition_id: edition,
      book_code: m.book_code,
      title: m.title,
      chapter: n,
      chapters: total,
      chapter_title: rows[0].chapter_title ?? undefined,
      parallel_lang: parallel ? parallelLang! : undefined,
      paragraphs: rows.map((r) => ({
        refcode: r.refcode,
        ord: r.ord,
        page: r.page ?? undefined,
        text: r.text,
        parallel_text: parallel?.get(r.refcode),
      })),
    };
  });
}

export function localHymns(code: string, q?: string): Schemas['HymnSummary'][] | null {
  const db = openPack(`hymnal-${code}`);
  if (!db) return null;
  return safe(() => {
    const query = q?.trim() ?? '';
    const rows = /^\d+$/.test(query)
      ? db.getAllSync<Omit<Schemas['HymnSummary'], 'has_audio'>>('SELECT number, title, original_title, category FROM hymns WHERE number = ?', [Number(query)])
      : query
        ? db.getAllSync<Omit<Schemas['HymnSummary'], 'has_audio'>>(
            'SELECT number, title, original_title, category FROM hymns WHERE title LIKE ? OR original_title LIKE ? ORDER BY number',
            [`%${query}%`, `%${query}%`],
          )
        : db.getAllSync<Omit<Schemas['HymnSummary'], 'has_audio'>>('SELECT number, title, original_title, category FROM hymns ORDER BY number');
    // Packs don't carry audio; the lyrics screen fetches audio URLs online when available.
    return rows.map((r) => ({ ...r, original_title: r.original_title ?? undefined, category: r.category ?? undefined, has_audio: false }));
  });
}

export function localHymn(code: string, number: number): Schemas['Hymn'] | null {
  const db = openPack(`hymnal-${code}`);
  if (!db) return null;
  return safe(() => {
    const h = db.getFirstSync<{ number: number; title: string; original_title: string | null; category: string | null }>(
      'SELECT number, title, original_title, category FROM hymns WHERE number = ?',
      [number],
    );
    if (!h) return null;
    const stanzas = db.getAllSync<Schemas['HymnStanza']>('SELECT idx, kind, text FROM stanzas WHERE number = ? ORDER BY idx', [number]);
    return { hymnal: code, number: h.number, title: h.title, original_title: h.original_title ?? undefined, category: h.category ?? undefined, stanzas };
  });
}
