import assert from 'node:assert/strict';
import test from 'node:test';

const { HUBS, HUB_TABS } = await import('../js/hubs.js');
const removedHubs = ['health', 'kitchen', 'house'];

test('health, kitchen, and house hubs are removed from navigation and tabs', () => {
  const routes = new Set(HUBS.map(([route]) => route));
  for (const route of removedHubs) {
    assert.equal(routes.has(route), false);
    assert.equal(route in HUB_TABS, false);
  }
});
