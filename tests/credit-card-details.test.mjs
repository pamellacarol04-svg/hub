import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { search: '', pathname: '/' };
const { DEFS, fieldHtml, readForm } = await import('../js/kinds.js');
const last4 = DEFS.creditcard.fields.find(field => field.k === 'd.last4');
const color = DEFS.creditcard.fields.find(field => field.k === 'd.color');

const readLast4 = value => readForm(
  { elements: { d__last4: { value } } },
  [last4],
  { kind: 'creditcard', data: {} },
);

const readCardColor = value => readForm(
  { elements: { d__color: { value } } },
  [color],
  { kind: 'creditcard', data: {} },
);

test('credit card form accepts and preserves exactly four digits, including leading zeroes', () => {
  assert.equal(readLast4('0123').row.data.last4, '0123');
  assert.equal(readLast4('').row.data.last4, null);
});

test('credit card form rejects anything other than four digits', () => {
  assert.match(readLast4('123').error, /exatamente 4 dígitos/);
  assert.match(readLast4('12a4').error, /exatamente 4 dígitos/);
  assert.match(readLast4('12345').error, /exatamente 4 dígitos/);
});

test('last-four field is numeric-only and warns against entering full card credentials', () => {
  const html = fieldHtml(last4);
  assert.match(html, /inputmode="numeric"/);
  assert.match(html, /maxlength="4"/);
  assert.match(html, /pattern="\[0-9\]\{4\}"/);
  assert.match(html, /Não informe o número completo nem o CVC/);
  assert.doesNotMatch(html, /name="d__(?:cvc|cvv|cardNumber)"/i);
});

test('credit card color accepts valid HEX and rejects invalid values', () => {
  assert.equal(readCardColor('#aabbcc').row.data.color, '#AABBCC');
  assert.match(readCardColor('not-a-color').error, /Cor do cartão/);
  assert.match(fieldHtml(color), /data-bind="hex-color-input"/);
});
