import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { search: '', pathname: '/' };
const { S } = await import('../js/core.js');
const { db } = await import('../js/data.js');
const { DEFS, RECURRENCE_CYCLES } = await import('../js/kinds.js');
const { processRecurringTransactions, recurrenceOccurrenceDate } = await import('../js/hub.js');

test('transaction editor offers recurring income and expense schedules with no end date', () => {
  const field = DEFS.txn.fields.find(item => item.k === 'd.recurrence');
  assert.deepEqual(field.options, Object.entries(RECURRENCE_CYCLES));
  assert.match(field.hint, /sem data final/i);
});

test('recurrence dates preserve weekly and calendar-based intervals', () => {
  assert.equal(recurrenceOccurrenceDate('2026-01-31', 'weekly', 2), '2026-02-14');
  assert.equal(recurrenceOccurrenceDate('2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(recurrenceOccurrenceDate('2026-01-31', 'monthly', 2), '2026-03-31');
  assert.equal(recurrenceOccurrenceDate('2026-01-31', 'quarterly', 1), '2026-04-30');
  assert.equal(recurrenceOccurrenceDate('2024-02-29', 'yearly', 1), '2025-02-28');
  assert.equal(recurrenceOccurrenceDate('2026-02-30', 'monthly', 1), null);
  assert.equal(recurrenceOccurrenceDate('2026-01-01', 'monthly', 0), null);
});

test('due transactions are created once and deactivation preserves their history', async () => {
  const originalSave = db.save;
  const originalInsertMany = db.insertMany;
  let serial = 0;
  db.save = async (_kind, row) => ({ ...row, created_at: row.created_at || 'created', updated_at: 'updated' });
  db.insertMany = async (_kind, rows) => rows.map(row => ({
    ...row, id: `generated-${++serial}`, created_at: 'created', updated_at: 'updated',
  }));
  S.items = [{
    id: 'template', kind: 'txn', title: 'Aluguel', day: '2026-01-31', amount: 1200, status: 'out', cat: 'home',
    data: { recurrence: 'monthly', recurrenceIndex: 1 },
  }];

  try {
    assert.equal(await processRecurringTransactions('2026-05-15'), 3);
    assert.deepEqual(S.items.filter(item => item.data?.recurrenceSource === 'template').map(item => item.day), [
      '2026-02-28', '2026-03-31', '2026-04-30',
    ]);
    assert.equal(S.items[0].data.nextOccurrence, '2026-05-31');
    assert.equal(await processRecurringTransactions('2026-05-15'), 0);

    S.items[0].data.recurrence = 'none';
    assert.equal(await processRecurringTransactions('2026-08-15'), 0);
    assert.equal(S.items.filter(item => item.data?.recurrenceSource === 'template').length, 3);
  } finally {
    db.save = originalSave;
    db.insertMany = originalInsertMany;
    S.items = [];
  }
});
