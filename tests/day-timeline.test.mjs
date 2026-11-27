import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { hash: '#/plan?tab=day', pathname: '/', search: '' };
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { tabDay } = await import('../js/views/planners.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

test('daily timeline covers 24 hours with half-hour planning slots', () => {
  const html = tabDay();
  const slots = [...html.matchAll(/<button class="tl-slot"[^>]*data-preset="([^"]+)"[^>]*>/g)]
    .map(([, preset]) => JSON.parse(preset.replaceAll('&quot;', '"')));

  assert.match(html, /style="--rows:48"/);
  assert.equal(slots.length, 48);
  assert.deepEqual(slots[0].data, { start: '00:00', end: '00:30' });
  assert.deepEqual(slots.at(-1).data, { start: '23:30', end: '23:59' });
  assert.match(html, /0h30/);
  assert.match(html, /23h30/);
});
