import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_STATES, canTransition, assertTransition } from '../src/domain/bookingStateMachine.js';
import { DomainError } from '../src/domain/errors.js';

const allowed = [
  ['pending', 'paid'],
  ['pending', 'cancelled'],
  ['paid', 'checked_in'],
  ['paid', 'refunded'],
  ['paid', 'cancelled'],
];

test('all documented booking states are available as data', () => {
  assert.deepEqual(BOOKING_STATES, ['pending', 'paid', 'cancelled', 'refunded', 'checked_in']);
});

for (const [from, to] of allowed) {
  test(`allows ${from} -> ${to}`, () => {
    assert.equal(canTransition(from, to), true);
    assert.equal(assertTransition(from, to), true);
  });
}

for (const from of BOOKING_STATES) {
  for (const to of BOOKING_STATES) {
    if (allowed.some(([allowedFrom, allowedTo]) => from === allowedFrom && to === allowedTo)) continue;
    test(`rejects ${from} -> ${to}`, () => {
      assert.equal(canTransition(from, to), false);
      assert.throws(() => assertTransition(from, to), error =>
        error instanceof DomainError && error.code === 'INVALID_TRANSITION');
    });
  }
}

test('rejects unknown states with INVALID_TRANSITION', () => {
  assert.equal(canTransition('unknown', 'paid'), false);
  assert.throws(() => assertTransition('pending', 'unknown'), error =>
    error instanceof DomainError && error.code === 'INVALID_TRANSITION');
});
