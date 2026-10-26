import { DomainError } from './errors.js';

export const BOOKING_STATES = Object.freeze([
  'pending',
  'paid',
  'cancelled',
  'refunded',
  'checked_in',
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['paid', 'cancelled']),
  paid: Object.freeze(['checked_in', 'refunded', 'cancelled']),
  cancelled: Object.freeze([]),
  refunded: Object.freeze([]),
  checked_in: Object.freeze([]),
});

export function canTransition(from, to) {
  return Object.hasOwn(ALLOWED_TRANSITIONS, from) &&
    ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `Booking cannot transition from "${from}" to "${to}"`,
      { from, to },
    );
  }
  return true;
}
