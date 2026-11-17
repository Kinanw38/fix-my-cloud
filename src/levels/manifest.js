// The app loads levels one by one with dynamic import, so a broken level file can never take down
// the board or the other levels. Tests load the same files statically through index.js.
export const manifest = [
  { id: 'p1-flip-the-switch', file: 'p1-flip-the-switch.js' },
  { id: 'p2-pin-the-version', file: 'p2-pin-the-version.js' },
  { id: 'inc-0001-open-to-the-world', file: 'inc-0001-open-to-the-world.js' },
  { id: 'inc-0002-key-in-the-repo', file: 'inc-0002-key-in-the-repo.js' },
  { id: 'inc-0003-pr-title', file: 'inc-0003-pr-title.js' },
  { id: 'inc-0004-destroy', file: 'inc-0004-destroy.js' },
  { id: 'inc-0005-metadata', file: 'inc-0005-metadata.js' },
  { id: 'inc-0006-label', file: 'inc-0006-label.js' },
];
