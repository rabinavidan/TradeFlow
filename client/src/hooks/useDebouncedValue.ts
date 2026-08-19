import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates after `delayMs` of no
 * further changes — used so the trade list search box doesn't fire an
 * API request on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
