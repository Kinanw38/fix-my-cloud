// Decides what the "What really happened" card may show.
// Only entries with at least one verified source are shown, and only their
// verified links. Otherwise the card falls back to the lesson alone.
export function visibleRealWorld(level) {
  const entries = (level.realWorld ?? [])
    .map((e) => ({ ...e, sources: e.sources.filter((s) => s.verified === true) }))
    .filter((e) => e.sources.length > 0);
  return entries.length
    ? { mode: 'verified', entries }
    : { mode: 'pattern', entries: [] };
}
