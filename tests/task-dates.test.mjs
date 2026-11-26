import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { search: '', pathname: '/' };
const { carried, taskDay } = await import('../js/hub.js');

test('date-pinned weekly tasks stay on their original past date', () => {
  const task = { day: '2026-11-22', status: 'todo', data: { fixedDate: true } };

  assert.equal(taskDay(task, '2026-11-25'), '2026-11-22');
  assert.equal(carried(task, '2026-11-25'), 0);
});

test('other overdue tasks continue rolling forward to today', () => {
  const task = { day: '2026-11-22', status: 'todo', data: {} };

  assert.equal(taskDay(task, '2026-11-25'), '2026-11-25');
  assert.equal(carried(task, '2026-11-25'), 3);
});
