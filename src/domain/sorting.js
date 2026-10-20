// Stable merge sort. The input array is never modified.
export function mergeSort(items, compare) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  if (typeof compare !== 'function') throw new TypeError('compare must be a function');

  function merge(left, right) {
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
      // Taking from the left on equality preserves original order (stability).
      if (compare(left[i], right[j]) <= 0) merged.push(left[i++]);
      else merged.push(right[j++]);
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    return merged;
  }

  function sortRange(start, end) {
    if (end - start <= 1) return items.slice(start, end);
    const middle = start + Math.floor((end - start) / 2);
    return merge(sortRange(start, middle), sortRange(middle, end));
  }

  return sortRange(0, items.length);
}
