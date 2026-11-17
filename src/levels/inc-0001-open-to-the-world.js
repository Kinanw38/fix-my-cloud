import { check } from '../rules/open-ports.js';
import { group, t } from './helpers.js';

const rule = (name, port, cidr) => [
  '  ingress {',
  `    description = "${name}"`,
  `    from_port   = ${port}`,
  `    to_port     = ${port}`,
  '    protocol    = "tcp"',
  `    cidr_blocks = [${cidr}]`,
  '  }',
];
const WORLD = '"0.0.0.0/0"';
// HTTPS stays public in both versions. Only SSH and MySQL change.
const build = (admin) => [
  'resource "aws_security_group" "web" {',
  '  name        = "web-server"',
  '  description = "Web server firewall"',
  '',
  ...rule('SSH', 22, admin), '', ...rule('MySQL', 3306, admin), '', ...rule('HTTPS', 443, WORLD),
  '}',
].join('\n');

const anchor = (port) => `to_port     = ${port}\n    protocol    = "tcp"\n    cidr_blocks = ["0.0.0.0/0"]`;
const to = (port, cidrs) => `to_port     = ${port}\n    protocol    = "tcp"\n    cidr_blocks = [${cidrs}]`;

const opts = (port) => [
  { id: 'office', label: t('Only the office range', 'רק טווח המשרד'), replace: to(port, '"203.0.113.0/24"'), good: true,
    why: t('Only known addresses can connect.', 'רק כתובות מוכרות יכולות להתחבר.') },
  { id: 'vpn', label: t('Only the VPN range', 'רק טווח ה-VPN'), replace: to(port, '"198.51.100.0/24"'), good: true,
    why: t('Access goes through the VPN.', 'הגישה עוברת דרך ה-VPN.') },
  { id: 'both', label: t('Office plus everyone', 'המשרד ועוד כולם'), replace: to(port, '"203.0.113.0/24", "0.0.0.0/0"'), good: false,
    why: t('The world range is still in the list.', 'הטווח הפתוח עדיין ברשימה.') },
  { id: "note", label: t("Mark the rule as admins only", "לסמן את הכלל כ\"למנהלים בלבד\""), replace: anchor(port) + '\n    # admins only', good: false,
    why: t("A note does not close a port. The whole internet can still connect.", "הערה לא סוגרת פורט. כל האינטרנט עדיין יכול להתחבר.") },
  { id: "port", label: t("Move it to a different port", "להעביר אותו לפורט אחר"), replace: to(port, '"0.0.0.0/0"').replace(`to_port     = ${port}`, `to_port     = ${port + 1}`), good: false,
    why: t("The rule still covers the old port, and everyone can still try the new one.", "הכלל עדיין מכסה את הפורט הישן, וכל אחד עדיין יכול לנסות את החדש.") },
];

export default {
  id: 'inc-0001-open-to-the-world',
  incidentId: 'INC-0001',
  title: t('Open to the world', 'פתוח לכולם'),
  intro: t(
    'A security group is the firewall of a server. This one lets everyone in.',
    'קבוצת אבטחה היא החומת אש של שרת. כאן היא נותנת לכולם להיכנס.'
  ),
  tags: ['Network', 'Cloud'],
  difficulty: 'easy',
  estimatedMinutes: 3,
  file: 'web-security-group.tf',
  scene: {
    brief: { en: "The web server's firewall has two rules that let anyone on the internet connect to remote login and to the database. Strangers can try to get in all day. Your job is to let only your own network in.", he: "בחומת האש של שרת האינטרנט יש שני כללים שמאפשרים לכל אחד באינטרנט להתחבר להתחברות מרחוק ולבסיס הנתונים. זרים יכולים לנסות להיכנס כל היום. התפקיד שלך הוא לאפשר רק לרשת שלך להיכנס." },
    actor: { icon: 'globe', label: { en: "Internet", he: "אינטרנט" } },
    target: { icon: 'rack', label: { en: "Web server", he: "שרת אינטרנט" } },
    meter: { en: "Open doors", he: "דלתות פתוחות" },
    capOpen: { en: "Door open. Anyone can walk in.", he: "הדלת פתוחה. כל אחד יכול להיכנס." },
    capClosed: { en: "Door locked. Nobody can walk in.", he: "הדלת נעולה. אף אחד לא יכול להיכנס." },
    alert: { en: "Two ports on the web server accept connections from everyone.", he: "שני פורטים בשרת מקבלים חיבורים מכולם." },
    goal: { en: "only let your own network reach SSH and the database.", he: "לאפשר רק לרשת שלך להגיע ל-SSH ולבסיס הנתונים." },
  },
  language: 'hcl',
  vulnerableCode: build(WORLD),
  graph: {
    nodes: [
      { id: 'net', label: t('Internet', 'אינטרנט'), kind: 'internet' },
      { id: 'sg', label: t('Security group', 'קבוצת אבטחה'), kind: 'firewall' },
      { id: 'web', label: t('Web server', 'שרת אינטרנט'), kind: 'server' },
      { id: 'db', label: t('MySQL database', 'בסיס נתונים MySQL'), kind: 'database' },
    ],
    edges: [{ from: 'net', to: 'sg' }, { from: 'sg', to: 'web' }, { from: 'web', to: 'db' }],
    attackPath: ['net', 'sg', 'web', 'db'],
  },
  hints: [
    t('Look at who may connect, not only at which port.', 'להסתכל על מי מורשה להתחבר, לא רק על איזה פורט.'),
    t('Two ingress rules open management and database ports to 0.0.0.0/0.', 'שני כללי כניסה פותחים פורטי ניהול ובסיס נתונים ל-0.0.0.0/0.'),
    t('Replace the world range with your office range, or remove the rule.', 'להחליף את הטווח הפתוח בטווח של המשרד, או להסיר את הכלל.'),
  ],
  check,
  choices: [
    group('ssh', ['ssh-open-world'], anchor(22), opts(22)),
    group('db', ['db-open-world'], anchor(3306), opts(3306)),
  ],
  fix: build('"203.0.113.0/24"'),
  lesson: {
    whatWasWrong: t('SSH and database ports accepted connections from any address.', 'פורט SSH ופורט בסיס הנתונים קיבלו חיבורים מכל כתובת.'),
    whyItMatters: t('Someone who finds an open SSH port can try to log in, and a database open to the world is a standing invitation.', 'מי שמוצא פורט SSH פתוח יכול לנסות להתחבר, ובסיס נתונים פתוח לכולם הוא הזמנה קבועה.'),
    bestPractice: t('Allow only the ranges that need access. Keep databases off the public internet.', 'אפשרו רק את הטווחים שצריכים גישה. החזיקו בסיסי נתונים רחוק מהאינטרנט.'),
  },
  realWorld: null,
};
