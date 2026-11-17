import { check } from '../rules/k8s-labels.js';
import { group, t } from './helpers.js';

const OLD = 'node-role.kubernetes.io/master: ""';
const build = (selector) => [
  'apiVersion: apps/v1',
  'kind: DaemonSet',
  'metadata:',
  '  name: route-reflector',
  '  namespace: network',
  'spec:',
  '  selector:',
  '    matchLabels:',
  '      app: route-reflector',
  '  template:',
  '    metadata:',
  '      labels:',
  '        app: route-reflector',
  '    spec:',
  '      nodeSelector:',
  `        ${selector}`,
  '      containers:',
  '        - name: reflector',
  '          image: registry.example.com/team/route-reflector:1.4.2',
].join('\n');

export default {
  id: 'inc-0006-label',
  incidentId: 'INC-0006',
  title: t('The label that vanished', 'התווית שנעלמה'),
  intro: t(
    'A DaemonSet runs one pod on every node that matches its selector. If the label it needs disappears, it matches none.',
    'DaemonSet מריץ pod אחד על כל node שמתאים ל-selector שלו. אם התווית שהוא צריך נעלמת, הוא לא מתאים לאף אחד.'
  ),
  tags: ['Kubernetes', 'Reliability'],
  difficulty: 'medium',
  estimatedMinutes: 4,
  file: 'route-reflector.yaml',
  scene: {
    brief: { en: "After a cluster upgrade, a label this workload depends on no longer exists, so it matches no nodes and nothing runs. Nothing crashed loudly. Your job is to point it at the label that exists now.", he: "אחרי שדרוג של הקלאסטר, תווית שעליה העומס הזה מסתמך כבר לא קיימת, ולכן הוא לא מתאים לאף node ושום דבר לא רץ. שום דבר לא קרס בקול רם. התפקיד שלך הוא להפנות אותו לתווית שקיימת עכשיו." },
    gap: 'tag',
    actor: { icon: 'package', label: { en: "Upgrade", he: "שדרוג" } },
    target: { icon: 'rack', label: { en: "DaemonSet", he: "DaemonSet" } },
    meter: { en: "Problems", he: "בעיות" },
    capOpen: { en: "No pods are scheduled.", he: "אף pod לא מתוזמן." },
    capClosed: { en: "Pods are scheduled again.", he: "ה-pods מתוזמנים שוב." },
    alert: { en: "After the upgrade, no pods run on the nodes.", he: "אחרי השדרוג אף pod לא רץ על ה-nodes." },
    goal: { en: "make the DaemonSet match the nodes again.", he: "לגרום ל-DaemonSet להתאים ל-nodes שוב." },
  },
  language: 'yaml',
  vulnerableCode: build(OLD),
  graph: {
    nodes: [
      { id: 'up', label: t('Cluster upgrade', 'שדרוג הקלאסטר'), kind: 'change' },
      { id: 'lbl', label: t('Node label', 'תווית node'), kind: 'config' },
      { id: 'ds', label: t('DaemonSet', 'DaemonSet'), kind: 'workload' },
      { id: 'net', label: t('Cluster routing', 'ניתוב בקלאסטר'), kind: 'service' },
    ],
    edges: [{ from: 'up', to: 'lbl' }, { from: 'lbl', to: 'ds' }, { from: 'ds', to: 'net' }],
    attackPath: ['up', 'lbl', 'ds', 'net'],
  },
  hints: [
    t('This is not an attack. Ask what an upgrade may have changed.', 'זו לא התקפה. לשאול מה שדרוג יכול היה לשנות.'),
    t('The nodeSelector uses a label with "master" in its name.', 'ה-nodeSelector משתמש בתווית שיש בה "master" בשם.'),
    t('Use node-role.kubernetes.io/control-plane instead.', 'להשתמש ב-node-role.kubernetes.io/control-plane במקום.'),
  ],
  check,
  choices: [
    group('selector', ['deprecated-master-label', 'missing-control-plane-label'], OLD, [
      { id: 'cp', label: t('Select control-plane', 'לבחור control-plane'), replace: 'node-role.kubernetes.io/control-plane: ""', good: true,
        why: t('The current label name matches the nodes again.', 'שם התווית הנוכחי מתאים שוב ל-nodes.') },
      { id: 'both', label: t('Keep master, add control-plane', 'להשאיר master, להוסיף control-plane'), replace: OLD + '\n        node-role.kubernetes.io/control-plane: ""', good: false,
        why: t('A selector needs every label to match. The old one still blocks it.', 'selector דורש שכל התוויות יתאימו. הישנה עדיין חוסמת.') },
      { id: "control", label: t("Use node-role.kubernetes.io/control", "להשתמש ב-node-role.kubernetes.io/control"), replace: 'node-role.kubernetes.io/control: ""', good: false,
        why: t("That label name does not exist. The exact name ends with control-plane.", "שם התווית הזה לא קיים. השם המדויק מסתיים ב-control-plane.") },
      { id: "none", label: t("Remove the label and let it run anywhere", "להסיר את התווית ולהריץ בכל מקום"), replace: '', good: false,
        why: t("Now it can run on every node, not only the ones it was made for.", "עכשיו הוא יכול לרוץ על כל node, לא רק על אלה שהוא נועד להם.") },
    ]),
  ],
  fix: build('node-role.kubernetes.io/control-plane: ""'),
  lesson: {
    whatWasWrong: t('The selector depended on a deprecated label that newer versions no longer set.', 'ה-selector הסתמך על תווית שהוצאה משימוש ושגרסאות חדשות כבר לא מגדירות.'),
    whyItMatters: t('Zero pods were scheduled, and nothing failed loudly.', 'אפס pods תוזמנו, ושום דבר לא נכשל בקול רם.'),
    bestPractice: t('Read deprecation notes before upgrades, test upgrades in staging, and alert on zero pods scheduled.', 'קראו הערות הוצאה משימוש לפני שדרוגים, בדקו שדרוגים ב-staging, והגדירו התראה על אפס pods מתוזמנים.'),
  },
  realWorld: [
    {
      name: 'Reddit', year: 2023,
      summary: t(
        'On 14 March 2023, after an upgrade to Kubernetes 1.24, the deprecated node-role.kubernetes.io/master label was no longer present. Route reflector selectors that depended on it stopped matching, and the incident lasted 314 minutes.',
        'ב-14 במרץ 2023, אחרי שדרוג ל-Kubernetes 1.24, התווית node-role.kubernetes.io/master שהוצאה משימוש כבר לא הייתה קיימת. ה-selectors של ה-route reflectors שהסתמכו עליה הפסיקו להתאים, והאירוע נמשך 314 דקות.'
      ),
      sources: [
        { title: 'r/RedditEng post', url: 'https://www.reddit.com/r/RedditEng/comments/11xx5o0/', verified: false },
        { title: 'Geek Cookbook post-mortem', url: 'https://geek-cookbook.funkypenguin.co.nz/blog/2023/03/24/post-mortem-reddit-pi-day-kube-1.25/', verified: false },
      ],
    },
  ],
};
