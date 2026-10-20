import { DomainError } from './errors.js';
import { mergeSort } from './sorting.js';

function validDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new DomainError('VALIDATION', `${field} must be an ISO date string`);
  }
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  if (!dateOnly && !isoDateTime) {
    throw new DomainError('VALIDATION', `${field} must be an ISO date string`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new DomainError('VALIDATION', `${field} must be a real date`);
  const calendarDate = value.slice(0, 10);
  const calendarTime = Date.parse(calendarDate);
  if (!Number.isFinite(calendarTime) || new Date(calendarTime).toISOString().slice(0, 10) !== calendarDate) {
    throw new DomainError('VALIDATION', `${field} must be a real date`);
  }
  return { value, time, dateOnly };
}

function eventDate(event) {
  const date = Date.parse(event.startsAt);
  return Number.isFinite(date) ? date : Number.POSITIVE_INFINITY;
}

function tiersOf(event) {
  return Array.isArray(event.tiers) ? event.tiers : [];
}

function tierPrice(tier) {
  return Number.isInteger(tier.priceCents) ? tier.priceCents : null;
}

function cheapestPrice(event) {
  const prices = tiersOf(event).map(tierPrice).filter(price => price !== null);
  return prices.length ? Math.min(...prices) : null;
}

function seatsLeft(tier) {
  if (Number.isFinite(tier.seatsLeft)) return tier.seatsLeft;
  if (Number.isFinite(tier.capacity) && Number.isFinite(tier.sold)) return tier.capacity - tier.sold;
  return 0;
}

function availableSeats(event) {
  return tiersOf(event).reduce((total, tier) => total + Math.max(0, seatsLeft(tier)), 0);
}

export function filterEvents(summaries, {
  q, city, from, to, maxPriceCents, onlyAvailable,
} = {}) {
  const fromDate = validDate(from, 'from');
  const toDate = validDate(to, 'to');
  const toBoundary = toDate?.dateOnly ? Date.parse(`${toDate.value}T23:59:59.999Z`) : toDate?.time;
  if (fromDate && toDate && fromDate.time > toBoundary) {
    throw new DomainError('VALIDATION', 'from must be on or before to');
  }
  if (maxPriceCents !== undefined && maxPriceCents !== null &&
      (!Number.isInteger(maxPriceCents) || !Number.isFinite(maxPriceCents) || maxPriceCents < 0)) {
    throw new DomainError('VALIDATION', 'maxPriceCents must be a whole number');
  }

  const query = typeof q === 'string' ? q.trim().toLocaleLowerCase() : '';
  const cityQuery = typeof city === 'string' ? city.trim().toLocaleLowerCase() : '';

  return summaries.filter(event => {
    if (query && ![event.title, event.venue].some(value =>
      typeof value === 'string' && value.toLocaleLowerCase().includes(query))) return false;
    if (cityQuery && (typeof event.city !== 'string' ||
      event.city.toLocaleLowerCase() !== cityQuery)) return false;

    const startsAt = eventDate(event);
    if (fromDate && startsAt < fromDate.time) return false;
    if (toDate) {
      // A date-only upper bound includes every time on that calendar day.
      if (toDate.dateOnly) {
        if (!Number.isFinite(startsAt) || new Date(startsAt).toISOString().slice(0, 10) > toDate.value) return false;
      } else if (startsAt > toDate.time) return false;
    }

    if (maxPriceCents !== undefined && maxPriceCents !== null) {
      const price = cheapestPrice(event);
      if (price === null || price > maxPriceCents) return false;
    }
    if (onlyAvailable && availableSeats(event) <= 0) return false;
    return true;
  });
}

export function sortEvents(summaries, sortBy) {
  const validSorts = new Set(['date', 'price', 'availability']);
  if (!validSorts.has(sortBy)) {
    throw new DomainError('VALIDATION', `Unknown sort option: ${sortBy}`);
  }

  function compareText(a, b) {
    const left = typeof a === 'string' ? a.toLocaleLowerCase() : '';
    const right = typeof b === 'string' ? b.toLocaleLowerCase() : '';
    return left < right ? -1 : left > right ? 1 : 0;
  }

  return mergeSort(summaries, (a, b) => {
    let primary = 0;
    if (sortBy === 'date') {
      const ad = eventDate(a);
      const bd = eventDate(b);
      primary = ad < bd ? -1 : ad > bd ? 1 : 0;
    }
    if (sortBy === 'price') {
      const ap = cheapestPrice(a);
      const bp = cheapestPrice(b);
      if (ap === null && bp !== null) primary = 1;
      else if (ap !== null && bp === null) primary = -1;
      else if (ap !== null && bp !== null) primary = ap - bp;
    }
    if (sortBy === 'availability') primary = availableSeats(b) - availableSeats(a);
    if (primary !== 0) return primary < 0 ? -1 : 1;
    const titleOrder = compareText(a.title, b.title);
    if (titleOrder !== 0) return titleOrder;
    return compareText(a.id, b.id);
  });
}

export function searchEvents(summaries, criteria, sortBy) {
  return sortEvents(filterEvents(summaries, criteria), sortBy);
}
