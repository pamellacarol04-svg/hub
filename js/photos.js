// Photos: shrink them in the browser, store them in your own private folder, show them with
// short-lived links.
import { S, $$, esc, icon, toast, fail, uid, hooks, demoGate } from './core.js';
import { db, descendants, isPrivatePath } from './data.js';

export const FULL_EDGE = 1800;   // long edge of the stored picture, in pixels
export const THUMB_EDGE = 560;   // long edge of the thumbnail
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/avif';
export const accept = ACCEPT;
export const ACCEPT_FILES = ACCEPT + ',application/pdf';
export const MAX_PDF = 8 * 1024 * 1024;
export const isPdf = (p) => p?.mime === 'application/pdf';
/** Pages register what to do with picked or dropped files that aren't for one item (e.g. new vision board cards). */
export const PICK_HOOKS = {};

// ---------------------------------------------------------------------
// Looking up photos
// ---------------------------------------------------------------------
export const photosOf = (itemId) => S.photos.filter(p => p.item_id === itemId).sort((a, b) => (a.position || 0) - (b.position || 0) || String(a.created_at).localeCompare(String(b.created_at)));
export const coverOf = (itemId) => photosOf(itemId)[0] || null;
export const photoBytes = () => S.photos.reduce((a, p) => a + (Number(p.bytes) || 0), 0);
export const fmtBytes = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`);

// ---------------------------------------------------------------------
// Short-lived links (cloud) or local files (demo), cached for 50 minutes
// ---------------------------------------------------------------------
const hub = new Map(); // path -> { url, at }
const TTL = 50 * 60 * 1000;
export const cachedUrl = (path) => { const c = path && hub.get(path); return c && Date.now() - c.at < TTL ? c.url : ''; };
async function sign(paths) {
  const need = [...new Set(paths.filter(p => p && !cachedUrl(p)))];
  if (!need.length) return;
  const got = await db.signUrls(need);
  for (const [p, u] of Object.entries(got)) hub.set(p, { url: u, at: Date.now() });
}
/** An <img> for a photo. It fills in its link after the page renders, if it isn't cached yet. */
export function img(p, opts = {}) {
  if (!p) return '';
  if (isPdf(p)) return `<span class="pdf-chip ${opts.cls || ''}">${icon('article')}<b>PDF</b></span>`;
  const path = opts.full ? p.path : (p.thumb || p.path); const u = cachedUrl(path);
  const ratio = p.w && p.h ? `aspect-ratio:${p.w}/${p.h};` : '';
  return `<img class="${opts.cls || ''}" ${u ? `src="${esc(u)}"` : ''} data-photo="${esc(path)}" alt="${esc(opts.alt ?? p.caption ?? '')}" loading="lazy" decoding="async" style="${opts.ratio === false ? '' : ratio}${opts.style || ''}" draggable="false">`;
}
async function hydrate() {
  const els = $$('img[data-photo]:not([src])'); if (!els.length) return;
  try { await sign(els.map(e => e.dataset.photo)); } catch (e) { console.error(e); }
  for (const e of els) { const u = cachedUrl(e.dataset.photo); if (u) e.src = u; else e.classList.add('missing'); }
}
hooks.after.push(() => { hydrate(); });
export const refreshPhotos = hydrate;

// ---------------------------------------------------------------------
// Shrinking: decode, resize on a canvas, encode as WebP (or JPEG where WebP isn't supported)
// ---------------------------------------------------------------------
async function decode(file) {
  if ('createImageBitmap' in window) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back */ } }
  const url = URL.createObjectURL(file);
  try { const im = new Image(); im.decoding = 'async'; im.src = url; await im.decode(); return im; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
const toBlob = (c, type, q) => new Promise(res => c.toBlob(res, type, q));
async function encode(src, edge, q) {
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight; const k = Math.min(1, edge / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h);
  let b = await toBlob(c, 'image/webp', q);
  if (!b || b.type !== 'image/webp') b = await toBlob(c, 'image/jpeg', q + 0.04);
  return { blob: b, w, h };
}
export async function shrink(file) {
  if (!/^image\//.test(file.type) && !/\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(file.name)) throw new Error(`${file.name} isn’t a photo.`);
  let src;
  try { src = await decode(file); } catch { throw new Error(`${file.name} couldn’t be opened. Try a JPEG or PNG.`); }
  const full = await encode(src, FULL_EDGE, 0.84); const thumb = await encode(src, THUMB_EDGE, 0.8);
  src.close?.();
  return { full, thumb };
}

// ---------------------------------------------------------------------
// Adding photos to an item
// ---------------------------------------------------------------------
let limit = null;
export async function photoLimit() { if (limit == null) limit = await db.maxPhotos(); return limit; }
export async function addPhotos(itemId, files, opts = {}) {
  if (demoGate('photos')) return [];
  const { onEach } = opts;
  files = [...files].filter(Boolean); if (!files.length) return [];
  const max = await photoLimit(); const room = max - S.photos.length;
  if (room <= 0) { toast(`You’ve reached your photo limit (${max}). Delete a few to make room.`, { error: true, ms: 6000 }); return []; }
  if (files.length > room) { toast(`Only ${room} more ${room === 1 ? 'photo fits' : 'photos fit'}. Adding the first ${room}.`, { ms: 5000 }); files = files.slice(0, room); }
  const out = []; const t = files.length > 1 ? toast(`Adding ${files.length} photos…`, { ms: 2500 }) : null;
  let pos = Math.max(-1, ...photosOf(itemId).map(p => p.position || 0)) + 1;
  for (const f of files) {
    try {
      const it = S.items.find(x => x.id === itemId); const dir = folderFor(it); const id = uid(); let row, path, tpath = null;
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        if (f.size > MAX_PDF) throw new Error(`${f.name} is over 8 MB. Try a smaller PDF, or a screenshot of the page that matters.`);
        path = `${dir}/${id}.pdf`; await db.upload(path, f.type === 'application/pdf' ? f : new Blob([f], { type: 'application/pdf' }));
        try { row = await db.save('photos', { id, item_id: itemId, path, thumb: null, mime: 'application/pdf', name: f.name.slice(0, 200), bytes: f.size, caption: f.name.slice(0, 200), day: opts.day || null, position: pos++ }); }
        catch (e) { await db.removeFiles([path]).catch(() => {}); throw e; }
      } else {
        const { full, thumb } = await shrink(f);
        const ext = full.blob.type === 'image/webp' ? 'webp' : 'jpg';
        path = `${dir}/${id}.${ext}`; tpath = `${dir}/${id}_t.${ext}`;
        await db.upload(path, full.blob); await db.upload(tpath, thumb.blob);
        try { row = await db.save('photos', { id, item_id: itemId, path, thumb: tpath, mime: full.blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg', name: null, w: full.w, h: full.h, bytes: full.blob.size + thumb.blob.size, caption: opts.caption || null, day: opts.day || null, position: pos++ }); }
        catch (e) { await db.removeFiles([path, tpath]).catch(() => {}); throw e; }
      }
      S.photos.push(row); out.push(row); onEach?.(row);
    } catch (e) { fail(e); if (/limit/i.test(e.message)) break; }
  }
  void t; return out;
}

/** Where files go: your own folder. */
export const folderFor = () => `${db.me}`;
/** When a row turns private (or shared), move the files you uploaded to match. Other people's files can't be moved, so the row keeps them. */
export async function syncPrivacy(it) {
  const want = Boolean(it.private); let moved = 0, stuck = 0;
  for (const p of photosOf(it.id)) {
    if (isPrivatePath(p.path) === want) continue;
    if (p.user_id && p.user_id !== db.me) { stuck++; continue; }
    const re = (x) => (x ? (want ? x.replace(`/${db.me}/`, `/${db.me}/private/`) : x.replace(`/${db.me}/private/`, `/${db.me}/`)) : x);
    await db.moveFile(p.path, re(p.path)); if (p.thumb) await db.moveFile(p.thumb, re(p.thumb));
    const saved = await db.save('photos', { ...p, path: re(p.path), thumb: re(p.thumb) }); Object.assign(p, saved); moved++;
  }
  return { moved, stuck };
}

/** Remove photos: the files first, then their rows. */
export async function deletePhotos(list) {
  if (!list.length) return;
  await db.removeFiles(list.flatMap(p => [p.path, p.thumb].filter(Boolean)));
  for (const p of list) { await db.remove('photos', p.id); S.photos = S.photos.filter(x => x.id !== p.id); }
}
/** Before an item is deleted: remove the files of its photos and of everything under it. */
export async function deleteFilesUnder(itemId) {
  const gone = descendants(S.items, [itemId]); const list = S.photos.filter(p => gone.has(p.item_id));
  if (list.length) await db.removeFiles(list.flatMap(p => [p.path, p.thumb].filter(Boolean)));
  return list.length;
}

// ---------------------------------------------------------------------
// The photo picker: a button and a drop zone
// ---------------------------------------------------------------------
/** A button that opens the file picker. On change, BINDS['photo-pick'] uploads to data-item (or calls a named hook). */
export const pickButton = (itemId, label = 'Add photos', opts = {}) => `<label class="btn ${opts.cls || ''}" data-drop="${esc(itemId || '')}" ${opts.hook ? `data-hook="${esc(opts.hook)}"` : ''}>${icon(opts.icon || 'camera')} <span>${esc(label)}</span><input type="file" accept="${opts.files ? ACCEPT_FILES : ACCEPT}" ${opts.single ? '' : 'multiple'} class="sr-only" data-bind="photo-pick" data-item="${esc(itemId || '')}" ${opts.hook ? `data-hook="${esc(opts.hook)}"` : ''}></label>`;

// ---------------------------------------------------------------------
// Saving every photo as one .zip (stored, not compressed: the photos already are)
// ---------------------------------------------------------------------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
export function makeZip(files) { // files: [{ name, data: Uint8Array }]
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name); const crc = crc32(f.data); const size = f.data.length;
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name); offset += 30 + name.length + size;
  }
  const csize = central.reduce((a, x) => a + x.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
