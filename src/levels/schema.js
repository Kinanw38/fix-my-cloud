// Level schema validator. Returns a list of error strings (empty = valid).
const LANGS = ['python', 'dockerfile', 'json', 'hcl', 'yaml'];
const DIFFS = ['easy', 'medium', 'hard'];
const TAGS = ['Secrets', 'CI/CD', 'Reliability', 'Cloud', 'Kubernetes', 'Network'];

const isText = (x) => x && typeof x.en === 'string' && x.en && typeof x.he === 'string' && x.he;

export function validateLevel(l) {
  const e = [];
  const need = (ok, msg) => { if (!ok) e.push(msg); };
  need(typeof l.id === 'string' && l.id, 'id');
  need(l.incidentId === null || /^INC-\d{4}$/.test(l.incidentId), 'incidentId');
  need(isText(l.title), 'title');
  need(isText(l.intro), 'intro');
  need(Array.isArray(l.tags) && l.tags.every((x) => TAGS.includes(x)), 'tags');
  need(DIFFS.includes(l.difficulty), 'difficulty');
  need(LANGS.includes(l.language), 'language');
  need(typeof l.vulnerableCode === 'string' && l.vulnerableCode, 'vulnerableCode');
  need(typeof l.fix === 'string' && l.fix, 'fix');
  need(typeof l.check === 'function', 'check');
  need(Number.isFinite(l.estimatedMinutes) && l.estimatedMinutes > 0, 'estimatedMinutes');
  need(Array.isArray(l.hints) && l.hints.length === 3 && l.hints.every(isText), 'hints (3 tiers)');
  const g = l.graph;
  const ids = new Set((g?.nodes ?? []).map((n) => n.id));
  need(g && g.nodes.length > 1 && g.nodes.every((n) => n.id && isText(n.label)), 'graph.nodes');
  need(g && g.edges.every((x) => ids.has(x.from) && ids.has(x.to)), 'graph.edges');
  need(g && g.attackPath.length > 1 && g.attackPath.every((x) => ids.has(x)), 'graph.attackPath');
  need(l.lesson && ['whatWasWrong', 'whyItMatters', 'bestPractice'].every((k) => isText(l.lesson[k])), 'lesson');
  need(Array.isArray(l.choices) && l.choices.length > 0, 'choices');
  for (const c of l.choices ?? []) {
    need(c.id && c.ruleIds?.length && c.anchor && l.vulnerableCode.includes(c.anchor), `choice ${c.id}: anchor must appear in the code`);
    need(c.options?.some((o) => o.good), `choice ${c.id}: needs a good option`);
    for (const o of c.options ?? []) {
      need(o.id && isText(o.label) && isText(o.why) && typeof o.good === 'boolean', `choice ${c.id}/${o.id}`);
      need(o.patch?.find === c.anchor && typeof o.patch.replace === 'string', `choice ${c.id}/${o.id}: patch`);
    }
  }
  need(typeof l.file === 'string' && l.file, 'file');
  const sc = l.scene;
  need(sc && ['globe', 'repo', 'comment', 'gear', 'package'].includes(sc.actor?.icon) && isText(sc.actor.label), 'scene.actor');
  need(sc && ['rack', 'db'].includes(sc.target?.icon) && isText(sc.target.label), 'scene.target');
  need(!sc?.gap || ['door', 'key', 'pin', 'terminal', 'lever', 'tag'].includes(sc.gap), 'scene.gap');
  need(sc && ['meter', 'capOpen', 'capClosed', 'alert', 'goal', 'brief'].every((k) => isText(sc[k])), 'scene texts');
  need(l.realWorld === null || Array.isArray(l.realWorld), 'realWorld');
  for (const r of l.realWorld ?? []) {
    need(r.name && (r.year === null || Number.isInteger(r.year)) && isText(r.summary), 'realWorld entry');
    need(r.sources?.length > 0 && r.sources.every((s) => s.title && /^https:\/\//.test(s.url) && typeof s.verified === 'boolean'), 'realWorld sources');
  }
  return e;
}
