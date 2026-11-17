import { checkSwitch } from '../rules/practice.js';
import { group, t } from './helpers.js';

const vulnerableCode = [
  'service: internal-billing',
  'network:',
  '  public: true',
  '  port: 8080',
].join('\n');

export default {
  id: 'p1-flip-the-switch',
  incidentId: null,
  title: t('Flip the switch', 'הפוך את המתג'),
  intro: t(
    'A fictional internal service is reachable from the internet. One line decides that.',
    'שירות פנימי מדומיין חשוף לאינטרנט. שורה אחת קובעת את זה.'
  ),
  tags: ['Cloud'],
  difficulty: 'easy',
  estimatedMinutes: 1,
  file: 'billing-service.yaml',
  scene: {
    brief: { en: "The billing service is meant to be internal, for your own team only. One setting was left on, so anyone on the internet can reach it. Your job is to close that door.", he: "שירות החיובים אמור להיות פנימי, רק לצוות שלך. הגדרה אחת נשארה דלוקה, ולכן כל אחד באינטרנט יכול להגיע אליו. התפקיד שלך הוא לסגור את הדלת הזאת." },
    actor: { icon: 'globe', label: { en: "Internet", he: "אינטרנט" } },
    target: { icon: 'rack', label: { en: "Billing service", he: "שירות החיובים" } },
    meter: { en: "Open doors", he: "דלתות פתוחות" },
    capOpen: { en: "Door open. Anyone can walk in.", he: "הדלת פתוחה. כל אחד יכול להיכנס." },
    capClosed: { en: "Door locked. Nobody can walk in.", he: "הדלת נעולה. אף אחד לא יכול להיכנס." },
    alert: { en: "The billing service can be reached from the internet.", he: "אפשר להגיע לשירות החיובים מהאינטרנט." },
    goal: { en: "close the door so the internet cannot reach billing.", he: "לסגור את הדלת כך שהאינטרנט לא יגיע לשירות החיובים." },
  },
  language: 'yaml',
  vulnerableCode,
  graph: {
    nodes: [
      { id: 'net', label: t('Internet', 'אינטרנט'), kind: 'internet' },
      { id: 'svc', label: t('Billing service', 'שירות החיובים'), kind: 'service' },
    ],
    edges: [{ from: 'net', to: 'svc' }],
    attackPath: ['net', 'svc'],
  },
  hints: [
    t('Look for a setting that says who can reach the service.', 'חפש הגדרה שקובעת מי יכול להגיע לשירות.'),
    t('The line `public: true` is the problem.', 'השורה `public: true` היא הבעיה.'),
    t('Change it to `public: false`.', 'שנה אותה ל-`public: false`.'),
  ],
  check: checkSwitch,
  choices: [
    group('public', ['service-public'], 'public: true', [
      { id: 'false', label: t('Set public to false', 'קבע public ל-false'), replace: 'public: false', good: true,
        why: t('The service is no longer reachable from outside.', 'השירות כבר לא נגיש מבחוץ.') },
      { id: 'quoted', label: t('Keep it and add a note', 'השאר והוסף הערה'), replace: 'public: "true"', good: false,
        why: t('A quoted true is still true. Nothing changed.', 'true במרכאות עדיין true. כלום לא השתנה.') },
      { id: "internal", label: t("Make it private and allow internal traffic only", "הפוך אותו לפרטי ואפשר רק תעבורה פנימית"), replace: 'public: false\n  allow: internal-only', good: true,
        why: t("Only your own network can reach it.", "רק הרשת שלך יכולה להגיע אליו.") },
      { id: "password", label: t("Keep it public, but add a password", "השאר אותו ציבורי, אבל הוסף סיסמה"), replace: 'public: true\n  password: required', good: false,
        why: t("A password helps, but anyone can still reach the door. An internal service should not be public at all.", "סיסמה עוזרת, אבל כל אחד עדיין יכול להגיע לדלת. שירות פנימי לא צריך להיות ציבורי בכלל.") },
      { id: "hide", label: t("Give it a name that is hard to guess", "תן לו שם שקשה לנחש"), replace: 'public: true\n  hostname: hidden-billing', good: false,
        why: t("Hiding is not protecting. Scanners find open services by address, not by name.", "הסתרה היא לא הגנה. סורקים מוצאים שירותים פתוחים לפי כתובת, לא לפי שם.") },
    ]),
  ],
  fix: vulnerableCode.replace('public: true', 'public: false'),
  lesson: {
    whatWasWrong: t('An internal service was marked public.', 'שירות פנימי סומן כציבורי.'),
    whyItMatters: t('Anything public gets probed by strangers within minutes.', 'כל מה שציבורי נבדק על ידי זרים תוך דקות.'),
    bestPractice: t('Default to private. Open things on purpose.', 'ברירת המחדל היא פרטי. פותחים רק בכוונה.'),
  },
  realWorld: null,
};
