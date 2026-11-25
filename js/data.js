// Data layer. Two backends with the same interface:
//  - cloud: Supabase (your account, your rows, your private photo folder)
//  - demo:  a preview kept in memory only: a refresh or a new visit starts over
import { CONFIG } from './config.js';
import { sampleData, DEMO_ME } from './sample.js';

export const ITEM_COLS = ['id','kind','parent_id','title','body','day','at','at2','amount','num','status','cat','url','position','data'];
export const PHOTO_COLS = ['id','item_id','path','thumb','mime','w','h','bytes','caption','position'];
export const SETTINGS_COLS = ['display_name','alter_ego','intention','intention_day','theme','low_stim','calm','decor','sound','currency','monthly_budget','board_year','week_start','tour_done','data'];
export const BUCKET = 'hub';
const NULLABLE_EMPTY = new Set(['title']);
const pick = (obj, cols) => { const out = {}; for (const c of cols) if (c in obj) out[c] = obj[c] === '' && !NULLABLE_EMPTY.has(c) ? null : (c === 'title' && obj[c] == null ? '' : obj[c]); return out; };
const clone = (x) => JSON.parse(JSON.stringify(x));
export const hasCloud = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseKey);
export const demoRequested = () => new URLSearchParams(location.search).has('demo');
const PRODUCT = CONFIG.product || 'hub';
export const MAX_PHOTOS_DEMO = 150;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const now = () => new Date().toISOString();
export const isPrivatePath = () => false;

/** Every item under these (children, grandchildren …), as the database's cascade would find them. */
export function descendants(items, ids) {
  const out = new Set(ids); let grew = true;
  while (grew) { grew = false; for (const x of items) if (x.parent_id && out.has(x.parent_id) && !out.has(x.id)) { out.add(x.id); grew = true; } }
  return out;
}

// ---------------------------------------------------------------------
// Demo backend
// ---------------------------------------------------------------------
const DEMO_KEY = 'hub-demo-v1';
let D = null;
function demoLoad() {
  try { const raw = window.__testHarness ? sessionStorage.getItem(DEMO_KEY) : null; if (raw) { const d = JSON.parse(raw); d.items ||= []; d.photos ||= []; d.settings ||= {}; return d; } } catch { /* storage unavailable */ }
  return sampleData();
}
function demoSave() { try { if (window.__testHarness) sessionStorage.setItem(DEMO_KEY, JSON.stringify(D)); } catch { /* full or private */ } }
const idb = (() => {
  let dbp = null;
  const open = () => (dbp ||= new Promise((res, rej) => { const r = indexedDB.open('hub-demo-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('files', mode); const st = t.objectStore('files'); const out = fn(st); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };
  return { put: (k, b) => tx('readwrite', s => s.put(b, k)), get: (k) => tx('readonly', s => s.get(k)), del: (k) => tx('readwrite', s => s.delete(k)), keys: () => tx('readonly', s => s.getAllKeys()), clear: () => tx('readwrite', s => s.clear()) };
})();
const blobUrls = new Map();

const demo = {
  mode: 'demo',
  me: DEMO_ME,
  async init() { try { localStorage.removeItem(DEMO_KEY); if (!window.__testHarness) sessionStorage.removeItem(DEMO_KEY); } catch { /* ignore */ } if (!window.__testHarness) { try { await idb.clear(); } catch { /* ignore */ } } D = demoLoad(); demoSave(); },
  async session() { return { user: { id: DEMO_ME, email: 'you@example.com' } }; },
  onAuthChange() {},
  async calendar(action) { throw new Error(`A sincronização com Google Agenda não está disponível na demonstração (${action}).`); },
  async queueCalendarDeletions() {},
  async resendConfirm() {},
  async owns() { return true; },
  async loadSettings() { return clone(D.settings); },
  async saveSettings(patch) { D.settings = { ...D.settings, ...pick(patch, SETTINGS_COLS) }; demoSave(); return clone(D.settings); },
  async loadAll() { return clone({ items: D.items, photos: D.photos }); },
  async save(kind, row) {
    const list = kind === 'photos' ? D.photos : D.items; const cols = kind === 'photos' ? PHOTO_COLS : ITEM_COLS;
    if (row.id && list.some(x => x.id === row.id)) { const i = list.findIndex(x => x.id === row.id); list[i] = { ...list[i], ...pick(row, cols), user_id: list[i].user_id, created_at: list[i].created_at, updated_at: now() }; demoSave(); return clone(list[i]); }
    if (kind === 'photos' && D.photos.length >= MAX_PHOTOS_DEMO) throw new Error(`The demo holds ${MAX_PHOTOS_DEMO} photos. Delete a few to add more.`);
    if (kind === 'items' && row.parent_id && !D.items.some(x => x.id === row.parent_id)) throw new Error('That item no longer exists.');
    const r = { id: row.id || uuid(), position: 0, data: {}, ...pick(row, cols), user_id: DEMO_ME, created_at: now(), updated_at: now() };
    list.push(r); demoSave(); return clone(r);
  },
  async insertMany(kind, rows) { const out = []; for (const r of rows) out.push(await this.save(kind, r)); return out; },
  async remove(kind, id) {
    if (kind === 'items') { const gone = descendants(D.items, [id]); D.items = D.items.filter(x => !gone.has(x.id)); D.photos = D.photos.filter(p => !gone.has(p.item_id)); }
    else D.photos = D.photos.filter(x => x.id !== id);
    demoSave();
  },
  async wipe() { D.items = []; D.photos = []; demoSave(); try { await idb.clear(); } catch { /* ignore */ } },
  async resetDemo() { D = sampleData(); demoSave(); try { await idb.clear(); } catch { /* ignore */ } },
  async upload(path, blob) { if (!window.__testHarness) throw new Error('Adding photos and files is part of the full version.'); await idb.put(path, blob); },
  async signUrls(paths) {
    const out = {};
    for (const p of paths) {
      if (p.startsWith('demo/')) { out[p] = p; continue; }
      if (blobUrls.has(p)) { out[p] = blobUrls.get(p); continue; }
      try { const b = await idb.get(p); if (b) { const u = URL.createObjectURL(b); blobUrls.set(p, u); out[p] = u; } } catch { /* missing */ }
    }
    return out;
  },
  async download(path) { if (path.startsWith('demo/')) return (await fetch(path)).blob(); return idb.get(path); },
  async removeFiles(paths) { for (const p of paths) { if (p.startsWith('demo/')) continue; try { await idb.del(p); } catch { /* ignore */ } const u = blobUrls.get(p); if (u) { URL.revokeObjectURL(u); blobUrls.delete(p); } } },
  async moveFile() {},
  async listFiles(prefix) { try { return (await idb.keys()).map(String).filter(k => k.startsWith(prefix + '/')); } catch { return []; } },
  async maxPhotos() { return MAX_PHOTOS_DEMO; },
};

// ---------------------------------------------------------------------
// Cloud backend (Supabase)
// ---------------------------------------------------------------------
let sb = null;
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const CHUNK = 200;
const num = (r) => { if (!r) return r; for (const k of ['amount', 'num', 'position', 'monthly_budget']) if (r[k] != null) r[k] = Number(r[k]); return r; };

const cloud = {
  mode: 'cloud',
  me: null,
  async init() {
    if (/^sb_secret_/.test(CONFIG.supabaseKey || '')) throw new Error('config.js has a secret key. Use the publishable key instead.');
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  },
  async session() { const s = must(await sb.auth.getSession()).session; this.me = s?.user?.id || null; return s; },
  onAuthChange(cb) { sb.auth.onAuthStateChange((event, session) => { this.me = session?.user?.id || this.me; setTimeout(() => cb(event, session), 0); }); },
  async signUp(email, password) { return must(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })); },
  async signIn(email, password) { return must(await sb.auth.signInWithPassword({ email, password })); },
  async signOut() { await sb.auth.signOut(); },
  async sendReset(email) { return must(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
  async resendConfirm(email) { return must(await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + location.pathname } })); },
  async updatePassword(password) { return must(await sb.auth.updateUser({ password })); },
  async calendar(action, payload = {}) {
    const result = await sb.functions.invoke('google-calendar', { body: { action, ...payload } });
    if (result.error) throw new Error(result.error.message || 'Falha ao falar com o serviço do Google Agenda.');
    if (result.data?.error) throw new Error(result.data.error);
    return result.data;
  },
  async queueCalendarDeletions(eventIds) {
    const rows = [...new Set(eventIds)].map(google_event_id => ({ user_id: this.me, google_event_id }));
    if (rows.length) must(await sb.from('hub_google_calendar_deletions').insert(rows));
  },
  async owns() { return Boolean(must(await sb.rpc('owns', { p_product: PRODUCT }))); },
  async redeem(code) { must(await sb.rpc('redeem_for', { p_code: code, p_product: PRODUCT })); return true; },
  async loadSettings() { return num(must(await sb.from('hub_settings').select('*').eq('user_id', this.me).maybeSingle())) || {}; },
  async saveSettings(patch) { return num(must(await sb.from('hub_settings').upsert({ user_id: this.me, ...pick(patch, SETTINGS_COLS) }).select().single())); },
  async loadAll() {
    const all = async (table, order) => { const out = []; for (let from = 0; ; from += 1000) { const rows = must(await sb.from(table).select('*').order(order).range(from, from + 999)); out.push(...rows); if (rows.length < 1000) break; } return out; };
    const [items, photos] = await Promise.all([all('hub_items', 'created_at'), all('hub_photos', 'position')]);
    return { items: items.map(num), photos };
  },
  async save(kind, row) {
    const table = kind === 'photos' ? 'hub_photos' : 'hub_items'; const data = pick(row, kind === 'photos' ? PHOTO_COLS : ITEM_COLS);
    // Rows that came from the database have created_at: update them. Anything else is new.
    if (row.id && row.created_at) { delete data.id; return num(must(await sb.from(table).update(data).eq('id', row.id).select().single())); }
    return num(must(await sb.from(table).insert(data).select().single()));
  },
  async insertMany(kind, rows) { const table = kind === 'photos' ? 'hub_photos' : 'hub_items'; const cols = kind === 'photos' ? PHOTO_COLS : ITEM_COLS; const out = []; for (let i = 0; i < rows.length; i += CHUNK) out.push(...must(await sb.from(table).insert(rows.slice(i, i + CHUNK).map(r => pick(r, cols))).select()).map(num)); return out; },
  async remove(kind, id) { must(await sb.from(kind === 'photos' ? 'hub_photos' : 'hub_items').delete().eq('id', id)); },
  async wipe() { must(await sb.from('hub_items').delete().is('parent_id', null).eq('user_id', this.me)); must(await sb.from('hub_items').delete().eq('user_id', this.me)); },
  async upload(path, blob) { must(await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' })); },
  async signUrls(paths) { const out = {}; for (let i = 0; i < paths.length; i += 100) { const list = must(await sb.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), 3600)); for (const x of list) if (x.signedUrl) out[x.path] = x.signedUrl; } return out; },
  async download(path) { return must(await sb.storage.from(BUCKET).download(path)); },
  async removeFiles(paths) { for (let i = 0; i < paths.length; i += 100) must(await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100))); },
  async moveFile() {},
  async listFiles(prefix) { const out = []; for (let offset = 0; ; offset += 1000) { const list = must(await sb.storage.from(BUCKET).list(prefix, { limit: 1000, offset })); out.push(...list.filter(f => f.id).map(f => `${prefix}/${f.name}`)); if (list.length < 1000) break; } return out; },
  async maxPhotos() { try { return must(await sb.rpc('hub_max_photos')); } catch { return 500; } },
};

export const db = hasCloud && !demoRequested() ? cloud : demo;
