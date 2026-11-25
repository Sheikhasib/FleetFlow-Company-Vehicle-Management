let idSequenceCounter = 0;

/**
 * Generates a collision-safe domain identifier preserving the entity prefix and
 * epoch timestamp while guaranteeing uniqueness within the same millisecond via a
 * zero-padded monotonic sequence counter and short random entropy suffix.
 */
export function generateUniqueId(prefix: string, suffix?: string): string {
  idSequenceCounter = (idSequenceCounter + 1) % 1679616; // 36^4 wrap-safe cycle
  const seq = idSequenceCounter.toString(36).padStart(4, '0');
  const rand = Math.random().toString(36).substring(2, 6);
  const base = `${prefix}_${Date.now()}_${seq}${rand}`;
  return suffix ? `${base}_${suffix}` : base;
}
