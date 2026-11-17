import { check } from '../rules/db-safety.js';
import { group, t } from './helpers.js';

const row = (k, v) => `  ${k.padEnd(23)} = ${v}`;
const SNAP_ID = row('final_snapshot_identifier', '"orders-prod-final"');
const head = [
  'resource "aws_db_instance" "orders" {',
  row('identifier', '"orders-prod"'),
  row('engine', '"postgres"'),
  row('instance_class', '"db.t3.medium"'),
  row('allocated_storage', '50'),
];
const LIFECYCLE = '\n\n  lifecycle {\n    prevent_destroy = true\n  }';

const A = {
  prot: row('deletion_protection', 'false'),
  back: row('backup_retention_period', '0'),
  snap: row('skip_final_snapshot', 'true'),
  engine: row('engine', '"postgres"'),
};

export default {
  id: 'inc-0004-destroy',
  incidentId: 'INC-0004',
  title: t('The destroy that ate production', 'ה-destroy שאכל את הפרודקשן'),
  intro: t(
    'One command can delete a whole database. Nothing here stands in its way.',
    'פקודה אחת יכולה למחוק בסיס נתונים שלם. כאן שום דבר לא עומד בדרכה.'
  ),
  tags: ['Cloud', 'Reliability'],
  difficulty: 'medium',
  estimatedMinutes: 5,
  file: 'orders-database.tf',
  scene: {
    brief: { en: "The production database has no protection. One command can delete it, with no backups and no final copy. Your job is to add the guards, so a wrong command cannot erase everything.", he: "לבסיס הנתונים של הפרודקשן אין שום הגנה. פקודה אחת יכולה למחוק אותו, בלי גיבויים ובלי עותק אחרון. התפקיד שלך הוא להוסיף הגנות, כדי שפקודה שגויה לא תמחק הכל." },
    gap: 'lever',
    actor: { icon: 'gear', label: { en: "Automation", he: "אוטומציה" } },
    target: { icon: 'db', label: { en: "Orders database", he: "בסיס נתוני ההזמנות" } },
    meter: { en: "Missing guards", he: "הגנות חסרות" },
    capOpen: { en: "One command can erase everything.", he: "פקודה אחת יכולה למחוק הכל." },
    capClosed: { en: "Deleting it is blocked now.", he: "המחיקה חסומה עכשיו." },
    alert: { en: "One wrong command can delete the production database.", he: "פקודה אחת שגויה יכולה למחוק את בסיס הנתונים של הפרודקשן." },
    goal: { en: "add guards so the database cannot be deleted by accident.", he: "להוסיף הגנות כדי שאי אפשר יהיה למחוק את בסיס הנתונים בטעות." },
  },
  language: 'hcl',
  vulnerableCode: [...head, A.prot, A.back, A.snap, '}'].join('\n'),
  graph: {
    nodes: [
      { id: 'agent', label: t('Automation', 'אוטומציה'), kind: 'automation' },
      { id: 'plan', label: t('terraform destroy', 'terraform destroy'), kind: 'command' },
      { id: 'db', label: t('Orders database', 'בסיס נתוני ההזמנות'), kind: 'database' },
      { id: 'bk', label: t('Backups', 'גיבויים'), kind: 'backup' },
    ],
    edges: [{ from: 'agent', to: 'plan' }, { from: 'plan', to: 'db' }, { from: 'db', to: 'bk' }],
    attackPath: ['agent', 'plan', 'db', 'bk'],
  },
  hints: [
    t('Ask what would still exist if this resource were deleted right now.', 'שאל מה היה נשאר אם המשאב הזה היה נמחק ברגע זה.'),
    t('Protection is off, retention is zero and no final snapshot is taken.', 'ההגנה כבויה, השמירה על גיבויים אפס ואין snapshot אחרון.'),
    t('Turn protection on, keep 7 or more days of backups, take a final snapshot and add prevent_destroy.', 'הפעל הגנה, שמור 7 ימי גיבוי או יותר, צלם snapshot אחרון והוסף prevent_destroy.'),
  ],
  check,
  choices: [
    group('protection', ['deletion-protection'], A.prot, [
      { id: 'on', label: t('Turn deletion protection on', 'הפעל הגנה מפני מחיקה'), replace: row('deletion_protection', 'true'), good: true,
        why: t('The API refuses to delete it until someone turns protection off.', 'ה-API מסרב למחוק עד שמישהו מכבה את ההגנה.') },
      { id: 'off', label: t('Leave it, add a comment', 'השאר והוסף הערה'), replace: row('deletion_protection', 'false') + ' ', good: false,
        why: t('A comment does not protect anything.', 'הערה לא מגינה על כלום.') },
      { id: "tag", label: t("Add a tag that says do-not-delete", "הוסף תג שאומר \"לא למחוק\""), replace: A.prot + '\n  tags = { note = "do-not-delete" }', good: false,
        why: t("A tag is only a label. Nothing stops the delete.", "תג הוא רק תווית. שום דבר לא עוצר את המחיקה.") },
    ]),
    group('backups', ['backup-retention'], A.back, [
      { id: 'seven', label: t('Keep 7 days', 'שמור 7 ימים'), replace: row('backup_retention_period', '7'), good: true,
        why: t('A week of restore points.', 'שבוע של נקודות שחזור.') },
      { id: 'fourteen', label: t('Keep 14 days', 'שמור 14 ימים'), replace: row('backup_retention_period', '14'), good: true,
        why: t('Two weeks of restore points.', 'שבועיים של נקודות שחזור.') },
      { id: 'one', label: t('Keep 1 day', 'שמור יום אחד'), replace: row('backup_retention_period', '1'), good: false,
        why: t('One day is too short to notice a problem and recover.', 'יום אחד קצר מדי כדי לשים לב לבעיה ולהתאושש.') },
      { id: "window", label: t("Set a backup window", "הגדר חלון גיבוי"), replace: A.back + '\n  backup_window = "03:00-04:00"', good: false,
        why: t("A window says when, not for how long. Retention is still zero.", "חלון אומר מתי, לא לכמה זמן. השמירה עדיין אפס.") },
    ]),
    group('snapshot', ['final-snapshot'], A.snap, [
      { id: 'final', label: t('Take a final snapshot', 'צלם snapshot אחרון'), replace: row('skip_final_snapshot', 'false') + '\n' + SNAP_ID, good: true,
        why: t('Even a deliberate delete leaves a copy behind.', 'גם מחיקה מכוונת משאירה עותק.') },
      { id: 'noid', label: t('Only flip the flag', 'רק הפוך את הדגל'), replace: row('skip_final_snapshot', 'false'), good: false,
        why: t('A final snapshot needs a name.', 'ל-snapshot אחרון צריך שם.') },
      { id: "named", label: t("Name a final snapshot but still skip it", "תן שם ל-snapshot אחרון אבל עדיין דלג עליו"), replace: A.snap + '\n' + SNAP_ID, good: false,
        why: t("A name changes nothing while skip_final_snapshot is true.", "שם לא משנה כלום כל עוד skip_final_snapshot הוא true.") },
    ]),
    group('lifecycle', ['prevent-destroy'], A.engine, [
      { id: 'guard', label: t('Add prevent_destroy', 'הוסף prevent_destroy'), replace: A.engine + LIFECYCLE, good: true,
        why: t('Terraform refuses any plan that would destroy it.', 'Terraform מסרב לכל תוכנית שהורסת אותו.') },
      { id: 'false', label: t('prevent_destroy = false', 'prevent_destroy = false'), replace: A.engine + LIFECYCLE.replace('true', 'false'), good: false,
        why: t('That guard is switched off.', 'המגן הזה כבוי.') },
      { id: "ignore", label: t("Ignore changes to the engine", "התעלם משינויים במנוע"), replace: A.engine + '\n\n  lifecycle {\n    ignore_changes = [engine]\n  }', good: false,
        why: t("That block exists, but it does not stop a destroy.", "הבלוק קיים, אבל הוא לא עוצר מחיקה.") },
    ]),
  ],
  fix: [
    ...head,
    row('deletion_protection', 'true'),
    row('backup_retention_period', '7'),
    row('skip_final_snapshot', 'false'),
    SNAP_ID,
    '',
    '  lifecycle {',
    '    prevent_destroy = true',
    '  }',
    '}',
  ].join('\n'),
  lesson: {
    whatWasWrong: t('The database had no protection, no backups and no final snapshot.', 'לבסיס הנתונים לא הייתה הגנה, גיבויים או snapshot אחרון.'),
    whyItMatters: t('One wrong command, human or automated, could remove the data and the way back.', 'פקודה אחת שגויה, של אדם או של אוטומציה, יכולה להסיר את הנתונים ואת הדרך חזרה.'),
    bestPractice: t('Keep backups outside the resource lifecycle, read the plan before apply, never auto-approve against production, and limit what automation or an AI agent may run.', 'שמרו גיבויים מחוץ למחזור החיים של המשאב, קראו את ה-plan לפני apply, לעולם אל תאשרו אוטומטית מול פרודקשן, והגבילו מה אוטומציה או סוכן AI רשאים להריץ.'),
  },
  realWorld: [
    {
      name: 'DataTalks.Club', year: 2026,
      summary: t(
        'On 26 February 2026 an AI coding agent ran terraform destroy against production using a state file that pointed at it. The database and its automated snapshots were deleted, and the data was restored with AWS support about a day later.',
        'ב-26 בפברואר 2026 סוכן קוד מבוסס AI הריץ terraform destroy מול הפרודקשן בעזרת קובץ state שהצביע עליו. בסיס הנתונים והגיבויים האוטומטיים נמחקו, והנתונים שוחזרו בעזרת תמיכת AWS כיום אחרי.'
      ),
      sources: [
        { title: 'Founder postmortem', url: 'https://alexeyondata.substack.com/p/how-i-dropped-our-production-database', verified: false },
        { title: 'Gruntwork: AI with Terraform', url: 'https://gruntwork.io/blog/thinking-of-using-ai-with-terraform', verified: false },
      ],
    },
  ],
};
