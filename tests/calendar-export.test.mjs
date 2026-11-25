import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarIcs } from '../js/calendar-export.mjs';

process.env.TZ = 'America/Sao_Paulo';

test('exports timed HUB blocks as UTC events with their description and location', () => {
  const ics = calendarIcs([{
    id: 'block-1',
    kind: 'block',
    title: 'Reunião, equipe',
    body: 'Plano; próximos passos',
    day: '2026-11-25',
    data: { start: '09:00', end: '10:30', place: 'Sala A' },
  }], new Date('2026-11-25T12:00:00Z'));

  assert.match(ics, /SUMMARY:Reunião\\, equipe/);
  assert.match(ics, /DESCRIPTION:Plano\\; próximos passos/);
  assert.match(ics, /LOCATION:Sala A/);
  assert.match(ics, /DTSTART:20261125T120000Z/);
  assert.match(ics, /DTEND:20261125T133000Z/);
});

test('exports all-day events with an exclusive end date and skips unrelated or undated items', () => {
  const ics = calendarIcs([
    { id: 'event-1', kind: 'event', title: 'Viagem', day: '2026-11-25', data: {} },
    { id: 'event-2', kind: 'event', title: 'Congresso', day: '2026-11-26', data: { endDay: '2026-11-29' } },
    { id: 'task-1', kind: 'task', title: 'Não exportar', day: '2026-11-25' },
    { id: 'event-3', kind: 'event', title: 'Sem data', day: '', data: {} },
  ], new Date('2026-11-25T12:00:00Z'));

  assert.match(ics, /DTSTART;VALUE=DATE:20261125\r\nDTEND;VALUE=DATE:20261126/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261126\r\nDTEND;VALUE=DATE:20261129/);
  assert.doesNotMatch(ics, /Não exportar|Sem data/);
});
