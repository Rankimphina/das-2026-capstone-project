import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../src/http/router.js';

test('router matches HTTP method and extracts named parameters', () => {
  const router = createRouter();
  const handler = () => {};
  router.add('GET', '/api/events/:eventId', handler);
  const match = router.match('GET', '/api/events/event-123');
  assert.equal(match.handler, handler);
  assert.deepEqual(match.params, { eventId: 'event-123' });
});

test('router does not match the wrong method or path', () => {
  const router = createRouter();
  router.add('GET', '/api/events/:eventId', () => {});
  assert.equal(router.match('POST', '/api/events/event-123'), null);
  assert.equal(router.match('GET', '/api/events'), null);
});

test('router decodes URL parameters and flags invalid encoding', () => {
  const router = createRouter();
  router.add('GET', '/api/events/:eventId', () => {});
  assert.deepEqual(router.match('GET', '/api/events/a%20b').params, { eventId: 'a b' });
  assert.equal(router.match('GET', '/api/events/%E0%A4%A').error, 'BAD_PATH_ENCODING');
});
