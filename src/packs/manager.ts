import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { Pack } from '@/api/client';

import { usePacksStore } from './store';

// Offline content packs: versioned read-only SQLite files from GET /v1/packs, stored in documents/packs.
const dir = () => new Directory(Paths.document, 'packs');
const fileName = (p: Pick<Pack, 'slug' | 'version'>) => `${p.slug}-v${p.version}.sqlite`;

const open = new Map<string, SQLiteDatabase>();
const inflight = new Map<string, Promise<void>>();

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Open (and cache) the installed pack for a slug; null when not installed or unreadable. */
export function openPack(slug: string): SQLiteDatabase | null {
  const inst = usePacksStore.getState().installed[slug];
  if (!inst) return null;
  const key = `${slug}@${inst.version}`;
  const cached = open.get(key);
  if (cached) return cached;
  try {
    const f = new File(dir(), inst.file);
    if (!f.exists) {
      usePacksStore.getState().setInstalled(null, slug);
      return null;
    }
    const db = openDatabaseSync(inst.file, { useNewConnection: true }, dir().uri);
    open.set(key, db);
    return db;
  } catch {
    return null;
  }
}

function closePack(slug: string) {
  for (const [key, db] of open) {
    if (key.startsWith(`${slug}@`)) {
      try {
        db.closeSync();
      } catch {}
      open.delete(key);
    }
  }
}

/** Download + verify a pack; replaces an older installed version only after the new one checks out. */
export function downloadPack(p: Pack): Promise<void> {
  const running = inflight.get(p.slug);
  if (running) return running;
  const { setStatus, setInstalled } = usePacksStore.getState();

  const task = (async () => {
    setStatus(p.slug, { state: 'downloading', progress: 0 });
    const tmp = new File(Paths.cache, `${fileName(p)}.part`);
    try {
      if (tmp.exists) tmp.delete();
      const d = dir();
      if (!d.exists) d.create({ idempotent: true, intermediates: true });

      await File.downloadFileAsync(p.url, tmp, {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) =>
          setStatus(p.slug, { state: 'downloading', progress: totalBytes > 0 ? bytesWritten / totalBytes : 0 }),
      });

      const sha = hex(await digest(CryptoDigestAlgorithm.SHA256, await tmp.bytes()));
      if (sha !== p.sha256.toLowerCase()) throw new Error('checksum mismatch');

      const prev = usePacksStore.getState().installed[p.slug];
      const dest = new File(d, fileName(p));
      if (dest.exists) dest.delete();
      tmp.move(dest);
      closePack(p.slug);
      setInstalled({ slug: p.slug, version: p.version, file: fileName(p), sha256: sha, bytes: p.bytes, lang: p.lang }, p.slug);
      if (prev && prev.file !== fileName(p)) {
        const old = new File(d, prev.file);
        if (old.exists) old.delete();
      }
      setStatus(p.slug, undefined);
    } catch (e) {
      if (tmp.exists) tmp.delete();
      setStatus(p.slug, { state: 'error', progress: 0, error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      inflight.delete(p.slug);
    }
  })();
  inflight.set(p.slug, task);
  return task;
}

export function removePack(slug: string) {
  const inst = usePacksStore.getState().installed[slug];
  closePack(slug);
  if (inst) {
    const f = new File(dir(), inst.file);
    if (f.exists) f.delete();
  }
  usePacksStore.getState().setInstalled(null, slug);
}

/** Download wanted packs that are missing or outdated in the manifest. Errors are kept in pack status. */
export async function syncPacks(manifest: Pack[], wanted: string[]) {
  const installed = usePacksStore.getState().installed;
  for (const p of manifest) {
    const have = installed[p.slug];
    const want = wanted.includes(p.slug) || !!have;
    if (want && (!have || have.version < p.version)) await downloadPack(p).catch(() => {});
  }
}

export const packsSupported = true;
