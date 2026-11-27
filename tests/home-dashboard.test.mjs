import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { hash: '#/home', pathname: '/', search: '' };
const { S, today } = await import('../js/core.js');
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { VIEWS_HOME } = await import('../js/views/home.js');
const { HUBS } = await import('../js/hubs.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

test('home dashboard no longer renders the habit heatmap card', () => {
  const html = VIEWS_HOME.home({}, HUBS);
  assert.doesNotMatch(html, /m-heat|Mapa de <em>hábitos<\/em>/);
  assert.match(html, /Tendência de <em>humor<\/em>/);
});

test('home dashboard shows the larger 24-hour clock directly above the monthly money card', () => {
  const originalItems = S.items;
  S.items = [{
    id: 'home-clock-block',
    kind: 'block',
    day: today(),
    title: 'Consulta de hoje',
    cat: 'blush',
    data: { start: '15:30', end: '16:00', color: '#F9C9DF' },
  }];

  try {
    const html = VIEWS_HOME.home({}, HUBS);
    const clockPosition = html.indexOf('data-agenda-clock');
    const moneyPosition = html.indexOf('money-card');
    assert.ok(clockPosition >= 0);
    assert.ok(moneyPosition > clockPosition);
    assert.doesNotMatch(html, /agenda-clock-card|Relógio <em>de hoje<\/em>|Abrir agenda/);
    assert.doesNotMatch(html, /day-clock-now-marker|data-clock-now-marker|day-clock-now-tick|data-clock-now-tick/);
    assert.match(html, /data-clock-time/);
    assert.match(html, /Consulta de hoje/);
    assert.match(html, /class="day-clock-hour" x="120" y="61">12h/);
    assert.match(html, /class="day-clock-hour" x="179" y="123">18h/);
    assert.match(html, /class="day-clock-hour" x="120" y="187">00h/);
    assert.match(html, /class="day-clock-hour" x="61" y="123">06h/);
    const clockDots = [...html.matchAll(/<circle class="day-clock-dot[^"]*"[^>]*r="([^"]+)"/g)];
    assert.equal(clockDots.length, 48);
    assert.ok(clockDots.every(([, radius]) => radius === '4.5'));
  } finally {
    S.items = originalItems;
  }
});
