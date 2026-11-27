import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { search: '', pathname: '/' };
const { cardInvoiceDueDate, cardInvoiceLines, cardInvoiceMonth } = await import('../js/hub.js');

test('purchases after the closing day belong to the following invoice month', () => {
  assert.equal(cardInvoiceMonth('2026-11-20', 20), '2026-11');
  assert.equal(cardInvoiceMonth('2026-11-21', 20), '2026-12');
  assert.equal(cardInvoiceMonth('2026-11-26', 6), '2026-12');
  assert.equal(cardInvoiceMonth('invalid', 20), null);
});

test('invoice due date is in the invoice month and clamps to its last day', () => {
  assert.equal(cardInvoiceDueDate({ data: { dueDay: 14 } }, '2026-12'), '2026-12-14');
  assert.equal(cardInvoiceDueDate({ data: { dueDay: 31 } }, '2027-02'), '2027-02-28');
});

test('monthly invoices include installment portions and exclude income and other cards', () => {
  const card = { id: 'card-1', data: { closingDay: 20 } };
  const transactions = [
    { id: 'purchase', kind: 'txn', status: 'out', day: '2026-11-21', title: 'Notebook', amount: 100, data: { card: 'card-1', installments: 3 } },
    { id: 'income', kind: 'txn', status: 'in', day: '2026-11-22', amount: 50, data: { card: 'card-1' } },
    { id: 'other-card', kind: 'txn', status: 'out', day: '2026-11-22', amount: 80, data: { card: 'card-2' } },
  ];

  assert.deepEqual(cardInvoiceLines(card, '2026-12', transactions).map(t => [t.id, t.installmentNumber, t.installmentAmount]), [['purchase', 1, 33.33]]);
  assert.deepEqual(cardInvoiceLines(card, '2027-01', transactions).map(t => [t.installmentNumber, t.installmentAmount]), [[2, 33.33]]);
  assert.deepEqual(cardInvoiceLines(card, '2027-02', transactions).map(t => [t.installmentNumber, t.installmentAmount]), [[3, 33.34]]);
});
