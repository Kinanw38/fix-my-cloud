import { check } from '../rules/hardcoded-key.js';
import { group, t } from './helpers.js';

const KEY = '    aws_access_key_id="FAKE_KEY_DO_NOT_USE_123",\n';
const SECRET = '    aws_secret_access_key="FAKE_SECRET_DO_NOT_USE_456",\n';
const build = (key, secret) => [
  'import boto3',
  '',
  '# Upload the nightly orders export',
  's3 = boto3.client(',
  '    "s3",',
  key + secret + '    region_name="eu-west-1",',
  ')',
  '',
  's3.upload_file("orders.csv", "orders-prod", "exports/orders.csv")',
].join('\n');

const sources = (list) => list.map(([title, url]) => ({ title, url, verified: false }));

export default {
  id: 'inc-0002-key-in-the-repo',
  incidentId: 'INC-0002',
  title: t('The key in the repo', 'המפתח בריפו'),
  intro: t(
    'An access key is a password for your cloud account. This one is typed straight into the code.',
    'מפתח גישה הוא סיסמה לחשבון הענן שלך. כאן הוא כתוב ישר בתוך הקוד.'
  ),
  tags: ['Secrets', 'Cloud'],
  difficulty: 'easy',
  estimatedMinutes: 3,
  file: 'export_orders.py',
  scene: {
    brief: { en: "A script uploads a nightly export to cloud storage, and the access key is written inside the code. If this file sits in a public repo, bots find the key within minutes and use it. Your job is to take the key out of the code.", he: "סקריפט מעלה כל לילה קובץ לאחסון בענן, ומפתח הגישה כתוב בתוך הקוד. אם הקובץ הזה בריפו ציבורי, בוטים מוצאים את המפתח תוך דקות ומשתמשים בו. התפקיד שלך הוא להוציא את המפתח מהקוד." },
    gap: 'key',
    actor: { icon: 'repo', label: { en: "Public repo", he: "ריפו ציבורי" } },
    target: { icon: 'db', label: { en: "Orders storage", he: "אחסון ההזמנות" } },
    meter: { en: "Keys in code", he: "מפתחות בקוד" },
    capOpen: { en: "Anyone can copy the key and walk in.", he: "כל אחד יכול להעתיק את המפתח ולהיכנס." },
    capClosed: { en: "The key is not in the code.", he: "המפתח כבר לא בקוד." },
    alert: { en: "A cloud key is sitting in a public repo.", he: "מפתח לענן יושב בריפו ציבורי." },
    goal: { en: "take the key out of the code.", he: "להוציא את המפתח מהקוד." },
  },
  language: 'python',
  vulnerableCode: build(KEY, SECRET),
  graph: {
    nodes: [
      { id: 'repo', label: t('Public repo', 'ריפו ציבורי'), kind: 'repo' },
      { id: 'key', label: t('Access key', 'מפתח גישה'), kind: 'secret' },
      { id: 'acct', label: t('Cloud account', 'חשבון ענן'), kind: 'account' },
      { id: 'bill', label: t('Your bill', 'החשבונית שלך'), kind: 'cost' },
    ],
    edges: [{ from: 'repo', to: 'key' }, { from: 'key', to: 'acct' }, { from: 'acct', to: 'bill' }],
    attackPath: ['repo', 'key', 'acct', 'bill'],
  },
  hints: [
    t('Ask what happens if this file is ever shared.', 'לשאול מה קורה אם הקובץ הזה ישותף יום אחד.'),
    t('Two arguments hold credentials as plain text.', 'שני ארגומנטים מחזיקים פרטי גישה כטקסט גלוי.'),
    t('Remove both and let boto3 find credentials from the environment or a role.', 'להסיר את שניהם ולתת ל-boto3 למצוא פרטי גישה מהסביבה או מתפקיד.'),
  ],
  check,
  choices: [
    group('key', ['hardcoded-credential'], KEY, [
      { id: 'remove', label: t('Remove the key line', 'להסיר את שורת המפתח'), replace: '', good: true,
        why: t('boto3 will read it from the environment or a role.', 'boto3 יקרא אותו מהסביבה או מתפקיד.') },
      { id: 'encode', label: t('Encode the key', 'לקודד את המפתח'), replace: '    aws_access_key_id="RkFLRQ==",\n', good: false,
        why: t('Encoding is not hiding. It is still in the code.', 'קידוד הוא לא הסתרה. זה עדיין בקוד.') },
      { id: "split", label: t("Split the key into two pieces", "לפצל את המפתח לשני חלקים"), replace: '    aws_access_key_id="FAKE_KEY_" "DO_NOT_USE_123",\n', good: false,
        why: t("The key is still written in the code. It is only chopped up.", "המפתח עדיין כתוב בקוד. הוא רק חתוך לחלקים.") },
    ]),
    group('secret', ['hardcoded-credential'], SECRET, [
      { id: 'remove', label: t('Remove the secret line', 'להסיר את שורת הסוד'), replace: '', good: true,
        why: t('No secret left in the file.', 'לא נשאר סוד בקובץ.') },
      { id: 'rename', label: t('Move it to another literal', 'להעביר למחרוזת אחרת'), replace: '    aws_secret_access_key="MOVED_SECRET",\n', good: false,
        why: t('A different literal is still a literal.', 'מחרוזת אחרת היא עדיין מחרוזת קבועה.') },
      { id: "split", label: t("Split the secret into two pieces", "לפצל את הסוד לשני חלקים"), replace: '    aws_secret_access_key="FAKE_SECRET_" "DO_NOT_USE_456",\n', good: false,
        why: t("The secret is still written in the code. It is only chopped up.", "הסוד עדיין כתוב בקוד. הוא רק חתוך לחלקים.") },
    ]),
  ],
  fix: build('', ''),
  lesson: {
    whatWasWrong: t('Long-lived credentials were written into source code.', 'פרטי גישה ארוכי טווח נכתבו בקוד המקור.'),
    whyItMatters: t('Bots scan public repositories for keys and use them within minutes.', 'בוטים סורקים ריפואים ציבוריים אחר מפתחות ומשתמשים בהם תוך דקות.'),
    bestPractice: t('Use roles or SSO. Add secret scanning, rotate keys and set billing alarms.', 'השתמשו בתפקידים או ב-SSO. הוסיפו סריקת סודות, החליפו מפתחות והגדירו התראות חיוב.'),
  },
  realWorld: [
    {
      name: 'Elektra-Leak campaign', year: null,
      summary: t(
        'Researchers at Palo Alto Networks tracked a campaign that harvested AWS credentials exposed in public GitHub repositories to launch EC2 instances for crypto mining. They observed at least 474 unique compute-optimized instances.',
        'חוקרים ב-Palo Alto Networks עקבו אחרי קמפיין שאסף פרטי גישה של AWS שנחשפו בריפואים ציבוריים ב-GitHub, והשתמש בהם להרצת שרתי EC2 לכריית קריפטו. הם זיהו לפחות 474 שרתים ייחודיים ממוטבי חישוב.'
      ),
      sources: sources([['Dark Reading: Elektra-Leak', 'https://www.darkreading.com/cloud-security/elektra-leak-attackers-harvest-aws-cloud-keys-github-campaign']]),
    },
    {
      name: 'Access key in a public repository', year: 2015,
      summary: t(
        'A developer was billed about $6,500 after miners used an access key found in code in a public GitHub repository. AWS later refunded the bill.',
        'מפתח קיבל חשבונית של כ-6,500 דולר אחרי שכורים השתמשו במפתח גישה שנמצא בקוד בריפו ציבורי ב-GitHub. AWS החזירה את הסכום בהמשך.'
      ),
      sources: sources([['AWS Insider, 2015', 'https://awsinsider.net/articles/2015/09/08/aws-bug-bill.aspx']]),
    },
    {
      name: 'Community report of a leaked token', year: 2022,
      summary: t(
        'In October 2022 a user on r/AWSCertifications described leaking an AWS access token on GitHub. Large EC2 instances were then launched in several regions.',
        'באוקטובר 2022 משתמש ב-r/AWSCertifications תיאר שדלף אצלו טוקן גישה של AWS ב-GitHub. אחר כך הופעלו שרתי EC2 גדולים בכמה אזורים.'
      ),
      sources: sources([['r/AWSCertifications thread', 'https://www.reddit.com/r/AWSCertifications/comments/y7r9wl/account_hacked/']]),
    },
    {
      name: 'Uber', year: 2016,
      summary: t(
        'Attackers used credentials found in a private GitHub repository to reach AWS data. Uber later said the repository lacked multi-factor authentication.',
        'תוקפים השתמשו בפרטי גישה שנמצאו בריפו פרטי ב-GitHub כדי להגיע לנתונים ב-AWS. אובר אמרה בהמשך שלריפו לא הייתה הגנת אימות רב-שלבי.'
      ),
      sources: sources([['The Register, 2018', 'https://www.theregister.com/2018/02/07/uber_quit_github_for_custom_code_after_2016_data_breach/']]),
    },
  ],
};
