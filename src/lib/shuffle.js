// Seeded shuffle so a run can be repeated from its seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// mode "easy": easy and medium levels, shuffled.
// mode "full": a ramp from easy to hard, shuffled within each difficulty.
// Returns up to 5 level ids. Practice levels are never included.
export function buildRun(levels, mode, seed) {
  const rand = mulberry32(seed);
  const pool = levels.filter((l) => l.incidentId !== null);
  if (mode === 'easy') {
    return shuffled(pool.filter((l) => l.difficulty !== 'hard'), rand).slice(0, 5).map((l) => l.id);
  }
  const ramp = ['easy', 'medium', 'hard'].flatMap((d) => shuffled(pool.filter((l) => l.difficulty === d), rand));
  if (ramp.length > 5) {
    // Drop one from the middle of the ramp so it still ends on the hardest.
    ramp.splice(1 + Math.floor(rand() * (ramp.length - 2)), 1);
  }
  return ramp.slice(0, 5).map((l) => l.id);
}
