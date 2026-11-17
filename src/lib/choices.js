// Tap mode: apply one option to the CURRENT editor text by exact replace.
// Uses indexOf/slice, not String.replace, so "$" in a patch is never special.
export function applyChoice(code, option) {
  const { find, replace } = option.patch;
  const i = code.indexOf(find);
  if (i === -1) return null;
  return code.slice(0, i) + replace + code.slice(i + find.length);
}
