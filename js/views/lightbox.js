// The lightbox: any photo full size with its neighbours . PDFs open in a new tab.
import { S, $, esc, icon, ACTIONS, rerender, fmtLong, toast, fail, openModal, closeModal } from '../core.js';
import { db } from '../data.js';
import { byId, remove, openEditor, editorKind } from '../kinds.js';
import { photosOf, img, deletePhotos, isPdf, cachedUrl, refreshPhotos } from '../photos.js';

/** Pages register how to find a photo's neighbours: GROUPS[name]() → photo rows. */
export const GROUPS = {};
ACTIONS['photo-view'] = async (b) => {
  const p = S.photos.find(x => x.id === b.dataset.id); if (!p) return;
  if (isPdf(p)) { await openFile(p); return; }
  const g = (GROUPS[b.dataset.group]?.() || photosOf(p.item_id)).filter(x => !isPdf(x));
  show(p, g.some(x => x.id === p.id) ? g : [p]);
};
export async function openFile(p) {
  const w = window.open('', '_blank'); // open now (user gesture), fill in once the link is signed
  try { let u = cachedUrl(p.path); if (!u) { const got = await db.signUrls([p.path]); u = got[p.path]; } if (!u) throw new Error('That file isn’t available.'); if (w) w.location.href = u; else location.href = u; } catch (e) { w?.close(); fail(e); }
}
function show(p, group) {
  const i = group.findIndex(x => x.id === p.id); const it = byId(p.item_id);
  openModal(`<div class="lightbox"><button class="icon-btn lb-close" data-action="close-modal" aria-label="Close">${icon('close')}</button>
    <figure>${img(p, { full: true, ratio: false, alt: p.caption || it?.title || 'Photo' })}<figcaption>${p.caption || it?.title ? `<span class="hand">${esc(p.caption || it.title)}</span>` : ''}<span class="small">${esc(fmtLong(p.day || String(p.created_at).slice(0, 10)))}</span></figcaption></figure>
    ${group.length > 1 ? `<button class="icon-btn lb-prev" data-action="lb-go" data-id="${esc(group[(i - 1 + group.length) % group.length].id)}" aria-label="Previous">${icon('back')}</button><button class="icon-btn lb-next" data-action="lb-go" data-id="${esc(group[(i + 1) % group.length].id)}" aria-label="Next">${icon('fwd')}</button>` : ''}
    <div class="lb-tools">${true ? `<button class="btn sm ghost" data-action="lb-del" data-id="${esc(p.id)}">${icon('trash')} Delete photo</button>` : ''}${it ? `<button class="btn sm" data-action="lb-edit" data-id="${esc(it.id)}">${icon('edit')} Edit</button>` : ''}</div></div>`, { size: 'photo' });
  S.ui.lbGroup = group.map(x => x.id);
  setTimeout(() => refreshPhotos(), 0);
}
ACTIONS['lb-go'] = (b) => { const p = S.photos.find(x => x.id === b.dataset.id); show(p, S.ui.lbGroup.map(id => S.photos.find(x => x.id === id)).filter(Boolean)); };
ACTIONS['lb-edit'] = (b) => { const x = byId(b.dataset.id); closeModal(); openEditor(editorKind(x), x); };
ACTIONS['lb-del'] = async (b) => {
  if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to delete'; return; }
  const p = S.photos.find(x => x.id === b.dataset.id); const it = byId(p.item_id);
  try { if (it && ['vpin', 'swipe', 'reel', 'vibe', 'physique', 'headshot', 'cover'].includes(it.kind) && photosOf(it.id).length <= 1) await remove(it.id); else await deletePhotos([p]); closeModal(); rerender(); toast('Photo deleted'); } catch (e) { fail(e); }
};
document.addEventListener('keydown', (e) => { if (!$('#modal .lightbox')) return; if (e.key === 'ArrowRight') $('#modal .lb-next')?.click(); if (e.key === 'ArrowLeft') $('#modal .lb-prev')?.click(); });
