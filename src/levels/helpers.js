// Small builders so level files stay readable.

// A Tap-mode group: every option replaces the same exact anchor text.
export const group = (id, ruleIds, anchor, options) => ({
  id,
  ruleIds,
  anchor,
  options: options.map((o) => ({
    id: o.id,
    label: o.label,
    patch: { find: anchor, replace: o.replace },
    good: o.good,
    why: o.why,
  })),
});

export const t = (en, he) => ({ en, he });
