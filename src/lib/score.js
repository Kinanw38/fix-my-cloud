// Per level: 100, -10 per hint tier reached, -1 per 10s after the first 60.
// "Show me the fix" counts as tier 3. Minimum 20.
export function levelScore({ maxTier = 0, seconds = 0 }) {
  const tier = Math.min(3, Math.max(0, maxTier));
  const slow = Math.floor(Math.max(0, seconds - 60) / 10);
  return Math.max(20, 100 - 10 * tier - slow);
}

// Rank over the 6 incident levels.
export function rankFor(total) {
  if (total >= 480) return 'runbook';
  if (total >= 300) return 'quiet';
  return 'rookie';
}
