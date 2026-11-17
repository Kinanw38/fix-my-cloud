import { check } from '../rules/imds-iam.js';
import { group, t } from './helpers.js';

const TOKENS = 'http_tokens = "optional"';
const ACTIONS = 'actions   = ["s3:*"]';
const RESOURCES = 'resources = ["*"]';
const build = ({ tokens, actions, resources }) => [
  'resource "aws_instance" "app" {',
  '  ami           = "ami-0abc1234example"',
  '  instance_type = "t3.small"',
  '',
  '  metadata_options {',
  `    ${tokens}`,
  '  }',
  '}',
  '',
  'data "aws_iam_policy_document" "app_s3" {',
  '  statement {',
  `    ${actions}`,
  `    ${resources}`,
  '  }',
  '}',
].join('\n');

const BUCKET = 'resources = ["arn:aws:s3:::orders-prod/*"]';

export default {
  id: 'inc-0005-metadata',
  incidentId: 'INC-0005',
  title: t('The metadata service', 'שירות המטא-דאטה'),
  intro: t(
    'Every cloud server can ask a local service for its own temporary credentials. A broad role makes those credentials powerful.',
    'כל שרת בענן יכול לבקש משירות מקומי את פרטי הגישה הזמניים שלו. תפקיד רחב הופך אותם לחזקים.'
  ),
  tags: ['Cloud', 'Network'],
  difficulty: 'hard',
  estimatedMinutes: 7,
  file: 'app-instance.tf',
  scene: {
    brief: { en: "Every cloud server can ask a local service for its own temporary keys. If an app is tricked, it can ask for them on the attacker's behalf, and the role behind those keys can do anything in storage. Your job is to make the keys harder to reach and weaker in power.", he: "כל שרת בענן יכול לבקש משירות מקומי את המפתחות הזמניים שלו. אם מרמים אפליקציה, היא יכולה לבקש אותם בשם תוקף, והתפקיד שמאחורי המפתחות יכול לעשות הכל באחסון. התפקיד שלך הוא להפוך את המפתחות לקשים יותר להשגה ועם פחות כוח." },
    actor: { icon: 'gear', label: { en: "Web app", he: "אפליקציית רשת" } },
    target: { icon: 'rack', label: { en: "Server role", he: "תפקיד השרת" } },
    meter: { en: "Open doors", he: "דלתות פתוחות" },
    capOpen: { en: "A tricked app can read the keys.", he: "אפליקציה שרימו אותה יכולה לקרוא את המפתחות." },
    capClosed: { en: "The keys need a token now.", he: "המפתחות דורשים טוקן עכשיו." },
    alert: { en: "A tricked app could read the server's keys.", he: "אפליקציה שרימו אותה יכולה לקרוא את המפתחות של השרת." },
    goal: { en: "make the keys harder to reach and weaker in power.", he: "להפוך את המפתחות לקשים יותר להשגה ועם פחות כוח." },
  },
  language: 'hcl',
  vulnerableCode: build({ tokens: TOKENS, actions: ACTIONS, resources: RESOURCES }),
  graph: {
    nodes: [
      { id: 'app', label: t('Web app', 'אפליקציית רשת'), kind: 'service' },
      { id: 'imds', label: t('Metadata service', 'שירות מטא-דאטה'), kind: 'metadata' },
      { id: 'role', label: t('Role credentials', 'פרטי גישה של התפקיד'), kind: 'secret' },
      { id: 's3', label: t('S3 buckets', 'דליי S3'), kind: 'storage' },
    ],
    edges: [{ from: 'app', to: 'imds' }, { from: 'imds', to: 'role' }, { from: 'role', to: 's3' }],
    attackPath: ['app', 'imds', 'role', 's3'],
  },
  hints: [
    t('Two separate things are too open: how credentials are fetched, and what they may do.', 'שני דברים פתוחים מדי: איך מביאים את פרטי הגישה, ומה מותר להם לעשות.'),
    t('http_tokens is optional, and the policy allows s3:* on every resource.', 'http_tokens אופציונלי, והמדיניות מתירה s3:* על כל משאב.'),
    t('Require tokens, then allow only a specific action on a specific bucket ARN.', 'לדרוש טוקנים, ואז לאפשר רק פעולה ספציפית על ARN של bucket ספציפי.'),
  ],
  check,
  choices: [
    group('tokens', ['imds-v1'], TOKENS, [
      { id: 'required', label: t('Require session tokens (IMDSv2)', 'נדרש טוקן סשן (IMDSv2)'), replace: 'http_tokens = "required"', good: true,
        why: t('A simple forwarded request can no longer read credentials.', 'בקשה מועברת פשוטה כבר לא יכולה לקרוא פרטי גישה.') },
      { id: 'hop', label: t('Required, hop limit 1', 'נדרש, hop limit 1'), replace: 'http_tokens = "required"\n    http_put_response_hop_limit = 1', good: true,
        why: t('Tokens are required, and containers cannot reach the service through a hop.', 'טוקנים נדרשים, וקונטיינרים לא מגיעים לשירות דרך hop.') },
      { id: 'limit-only', label: t('Only lower the hop limit', 'רק להוריד את hop limit'), replace: TOKENS + '\n    http_put_response_hop_limit = 1', good: false,
        why: t('Tokens are still optional.', 'הטוקנים עדיין אופציונליים.') },
      { id: "tags", label: t("Turn off the instance tags in the metadata service", "לכבות את תגיות המופע בשירות המטא-דאטה"), replace: TOKENS + '\n    instance_metadata_tags = "disabled"', good: false,
        why: t("That hides some data, but tokens are still optional.", "זה מסתיר חלק מהמידע, אבל הטוקנים עדיין אופציונליים.") },
    ]),
    group('actions', ['wildcard-action'], ACTIONS, [
      { id: 'get', label: t('s3:GetObject only', 's3:GetObject בלבד'), replace: 'actions   = ["s3:GetObject"]', good: true,
        why: t('Read objects, nothing else.', 'קריאת אובייקטים, לא יותר.') },
      { id: 'getlist', label: t('GetObject and ListBucket', 'GetObject ו-ListBucket'), replace: 'actions   = ["s3:GetObject", "s3:ListBucket"]', good: true,
        why: t('Two specific actions the app really needs.', 'שתי פעולות ספציפיות שהאפליקציה באמת צריכה.') },
      { id: 'mixed', label: t('Add GetObject, keep s3:*', 'להוסיף GetObject, להשאיר s3:*'), replace: 'actions   = ["s3:*", "s3:GetObject"]', good: false,
        why: t('The wildcard is still in the list.', 'ה-wildcard עדיין ברשימה.') },
    ]),
    group('resources', ['wildcard-resource'], RESOURCES, [
      { id: 'bucket', label: t('One bucket ARN', 'ARN של bucket אחד'), replace: BUCKET, good: true,
        why: t('The role reaches one bucket only.', 'התפקיד מגיע ל-bucket אחד בלבד.') },
      { id: 'all-s3', label: t('All buckets', 'כל ה-buckets'), replace: 'resources = ["arn:aws:s3:::*"]', good: false,
        why: t('Every bucket is still included.', 'כל ה-buckets עדיין כלולים.') },
      { id: "account", label: t("Keep * but say it is for this account only", "להשאיר * אבל לכתוב שזה לחשבון הזה בלבד"), replace: RESOURCES + '  # this account only', good: false,
        why: t("A note changes nothing. The role can still reach every resource.", "הערה לא משנה כלום. התפקיד עדיין יכול להגיע לכל משאב.") },
    ]),
  ],
  fix: build({
    tokens: 'http_tokens = "required"\n    http_put_response_hop_limit = 1',
    actions: 'actions   = ["s3:GetObject"]',
    resources: BUCKET,
  }),
  lesson: {
    whatWasWrong: t('The instance allowed the older metadata protocol, and its role could do anything in S3.', 'המופע אפשר את פרוטוקול המטא-דאטה הישן, והתפקיד שלו יכול היה לעשות הכול ב-S3.'),
    whyItMatters: t('If an app can be tricked into making a request for the attacker, a broad role turns a small bug into a large breach.', 'אם אפשר לרמות אפליקציה לשלוח בקשה עבור תוקף, תפקיד רחב הופך באג קטן לפריצה גדולה.'),
    bestPractice: t('Require IMDSv2 and give each role only the actions and resources it needs.', 'דרשו IMDSv2 ותנו לכל תפקיד רק את הפעולות והמשאבים שהוא צריך.'),
  },
  realWorld: [
    {
      name: 'Capital One', year: 2019,
      summary: t(
        'A misconfigured web application firewall let an intruder relay requests to a back-end resource. Public analyses commonly describe an SSRF reaching the instance metadata service and temporary role credentials with broad S3 access, though analysts differ on the exact mechanism.',
        'חומת אש לאפליקציות רשת שהוגדרה לא נכון אפשרה לפורץ להעביר בקשות למשאב פנימי. ניתוחים פומביים מתארים בדרך כלל SSRF שהגיע לשירות המטא-דאטה ולפרטי גישה זמניים עם גישה רחבה ל-S3, אך האנליסטים חלוקים לגבי המנגנון המדויק.'
      ),
      sources: [
        { title: 'Krebs on Security', url: 'https://krebsonsecurity.com/2019/08/what-we-can-learn-from-the-capital-one-hack/', verified: false },
        { title: 'CloudSEK analysis', url: 'https://www.cloudsek.com/ar/knowledge-base/capital-one-data-breach', verified: false },
      ],
    },
  ],
};
