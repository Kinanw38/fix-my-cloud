import { check } from '../rules/actions-injection.js';
import { group, t } from './helpers.js';

const RUN = 'run: echo "Validating: ${{ github.event.pull_request.title }}"';
const build = ({ perms, step }) => [
  'name: Validate PR',
  'on:',
  '  pull_request_target:',
  '    types: [opened, edited]',
  '',
  ...perms,
  'jobs:',
  '  validate:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: Check title',
  `        ${step}`,
].join('\n');

const vulnerableCode = build({ perms: [], step: RUN });
const PERM = 'jobs:';
const SAFE_STEP = 'env:\n          PR_TITLE: ${{ github.event.pull_request.title }}\n        run: echo "Validating: $PR_TITLE"';

export default {
  id: 'inc-0003-pr-title',
  incidentId: 'INC-0003',
  title: t('The PR title that ran commands', 'כותרת ה-PR שהריצה פקודות'),
  intro: t(
    'A pull request title is text typed by a stranger. Here it is pasted into a shell command.',
    'כותרת של pull request היא טקסט שזר הקליד. כאן היא מודבקת לתוך פקודת shell.'
  ),
  tags: ['CI/CD', 'Secrets'],
  difficulty: 'medium',
  estimatedMinutes: 5,
  file: 'validate-pr.yml',
  scene: {
    brief: { en: "A workflow checks every pull request title. It pastes the title straight into a shell command, so a stranger can write a title that runs their own commands. Your job is to stop the title from running as a command.", he: "ה-workflow בודק כל כותרת של pull request. הוא מדביק את הכותרת ישר בתוך פקודת shell, ולכן זר יכול לכתוב כותרת שמריצה פקודות משלו. התפקיד שלך הוא לעצור את הכותרת מלרוץ כפקודה." },
    gap: 'terminal',
    actor: { icon: 'comment', label: { en: "PR title", he: "כותרת PR" } },
    target: { icon: 'rack', label: { en: "CI runner", he: "רנר ה-CI" } },
    meter: { en: "Problems", he: "בעיות" },
    capOpen: { en: "A stranger's text runs as commands.", he: "טקסט של זר רץ כפקודות." },
    capClosed: { en: "The title is only text now.", he: "הכותרת היא רק טקסט עכשיו." },
    alert: { en: "A pull request title is running as a command.", he: "כותרת של pull request רצה כפקודה." },
    goal: { en: "stop the title from running as a command.", he: "לעצור את הכותרת מלרוץ כפקודה." },
  },
  language: 'yaml',
  vulnerableCode,
  graph: {
    nodes: [
      { id: 'pr', label: t('Pull request title', 'כותרת ה-PR'), kind: 'input' },
      { id: 'wf', label: t('Workflow run step', 'שלב run בוורקפלו'), kind: 'ci' },
      { id: 'tok', label: t('Repo token', 'טוקן הריפו'), kind: 'secret' },
      { id: 'pkg', label: t('Published package', 'חבילה שפורסמה'), kind: 'artifact' },
    ],
    edges: [{ from: 'pr', to: 'wf' }, { from: 'wf', to: 'tok' }, { from: 'tok', to: 'pkg' }],
    attackPath: ['pr', 'wf', 'tok', 'pkg'],
  },
  hints: [
    t('Ask who controls the text inside the ${{ }} expression.', 'לשאול מי שולט בטקסט שבתוך הביטוי ${{ }}.'),
    t('The run line expands the PR title before the shell sees it. Also check the permissions.', 'שורת ה-run מרחיבה את כותרת ה-PR לפני שה-shell רואה אותה. לבדוק גם את ההרשאות.'),
    t('Pass the title through env: and read it as a quoted variable. Add a minimal permissions block.', 'להעביר את הכותרת דרך env: ולקרוא אותה כמשתנה במרכאות. להוסיף בלוק permissions מינימלי.'),
  ],
  check,
  choices: [
    group('perms', ['no-permissions', 'write-all'], PERM, [
      { id: 'read', label: t('permissions: contents: read', 'permissions: contents: read'), replace: 'permissions:\n  contents: read\n\njobs:', good: true,
        why: t('The token can only read. A bug cannot write.', 'הטוקן יכול רק לקרוא. באג לא יכול לכתוב.') },
      { id: 'all', label: t('permissions: write-all', 'permissions: write-all'), replace: 'permissions: write-all\n\njobs:', good: false,
        why: t('That gives the token every right. It is the opposite of least privilege.', 'זה נותן לטוקן את כל ההרשאות. ההפך מהרשאה מינימלית.') },
      { id: "none", label: t("Give the token no permissions at all", "לא לתת לטוקן שום הרשאה"), replace: 'permissions: {}\n\njobs:', good: true,
        why: t("Nothing to abuse. Add back only what a step really needs.", "אין מה לנצל. להוסיף בחזרה רק מה שצעד באמת צריך.") },
      { id: "default", label: t("Leave permissions as they are", "להשאיר את ההרשאות כמו שהן"), replace: PERM, good: false,
        why: t("Without a permissions block the token gets default rights.", "בלי בלוק permissions הטוקן מקבל הרשאות ברירת מחדל.") },
    ]),
    group('title', ['untrusted-in-run'], RUN, [
      { id: 'env', label: t('Pass it through env:', 'להעביר דרך env:'), replace: SAFE_STEP, good: true,
        why: t('The shell reads a variable. It never parses the title as code.', 'ה-shell קורא משתנה. הוא אף פעם לא מפרש את הכותרת כקוד.') },
      { id: 'quotes', label: t('Wrap it in single quotes', 'לעטוף במרכאות בודדות'), replace: "run: echo 'Validating: ${{ github.event.pull_request.title }}'", good: false,
        why: t('The expression is replaced before the shell runs. A quote in the title closes yours.', 'הביטוי מוחלף לפני שה-shell רץ. מרכאה בכותרת סוגרת את שלך.') },
      { id: "branch", label: t("Print the branch name instead of the title", "להדפיס את שם הענף במקום הכותרת"), replace: 'run: echo "Validating: ${{ github.head_ref }}"', good: false,
        why: t("Branch names are written by the author too. It is the same problem.", "שמות ענפים נכתבים גם הם על ידי המחבר. זו אותה בעיה.") },
    ]),
  ],
  fix: build({ perms: ['permissions:', '  contents: read', ''], step: SAFE_STEP }),
  lesson: {
    whatWasWrong: t('Untrusted text was expanded inside a shell script, in a workflow with default permissions.', 'טקסט לא מהימן הורחב בתוך סקריפט shell, בוורקפלו עם הרשאות ברירת מחדל.'),
    whyItMatters: t('Whoever writes the title can make the runner execute their commands and reach its token.', 'מי שכותב את הכותרת יכול לגרום לרנר להריץ את הפקודות שלו ולהגיע לטוקן.'),
    bestPractice: t('Pass event data through env:, quote the variable, and set minimal permissions.', 'העבירו מידע מאירועים דרך env:, שימו את המשתנה במרכאות והגדירו הרשאות מינימליות.'),
  },
  realWorld: [
    {
      name: 'Nx', year: 2025,
      summary: t(
        'A workflow echoed a pull request title inside a run step. An attacker used that injection to trigger a more privileged workflow and exfiltrate an npm token.',
        'וורקפלו הדפיס כותרת של pull request בתוך שלב run. תוקף ניצל את ההזרקה כדי להפעיל וורקפלו בעל הרשאות גבוהות יותר ולהוציא טוקן npm.'
      ),
      sources: [{ title: 'Socket: CI/CD security glossary', url: 'https://socket.dev/glossary/ci-cd-security.md', verified: false }],
    },
    {
      name: 'Ultralytics', year: 2024,
      summary: t(
        'In December 2024 a script injection in GitHub Actions led to trojanized versions of the Python package on PyPI.',
        'בדצמבר 2024 הזרקת סקריפט ב-GitHub Actions הובילה לגרסאות מוטמעות בקוד זדוני של החבילה בפייתון ב-PyPI.'
      ),
      sources: [{ title: 'CSO Online', url: 'https://www.csoonline.com/article/3619159/supply-chain-compromise-of-ultralytics-ai-library-results-in-trojanized-versions.html', verified: false }],
    },
  ],
};
