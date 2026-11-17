import { checkPin } from '../rules/practice.js';
import { group, t } from './helpers.js';

const vulnerableCode = [
  'FROM python:latest',
  'WORKDIR /app',
  'COPY . .',
  'CMD ["python", "main.py"]',
].join('\n');

export default {
  id: 'p2-pin-the-version',
  incidentId: null,
  title: t('Pin the version', 'לנעוץ את הגרסה'),
  intro: t(
    'The tag "latest" changes without warning. Your build can break on a day you changed nothing.',
    'התג "latest" משתנה בלי התראה. הבנייה יכולה להישבר ביום שלא שינית בו כלום.'
  ),
  tags: ['Reliability'],
  difficulty: 'easy',
  estimatedMinutes: 1,
  file: 'Dockerfile',
  scene: {
    brief: { en: "Your build starts from a base image and asks for the version called latest. That version can change overnight, so the build can break on a day nobody touched it. Your job is to pin it to one fixed version.", he: "הבנייה שלך מתחילה מתמונת בסיס ומבקשת את הגרסה שנקראת latest. הגרסה הזאת יכולה להשתנות בן לילה, והבנייה יכולה להישבר ביום שאף אחד לא נגע בו. התפקיד שלך הוא לנעוץ אותה לגרסה אחת קבועה." },
    gap: 'pin',
    actor: { icon: 'package', label: { en: "Image registry", he: "רישום תמונות" } },
    target: { icon: 'rack', label: { en: "Your build", he: "הבנייה שלך" } },
    meter: { en: "Moving versions", he: "גרסאות זזות" },
    capOpen: { en: "The version can change any day.", he: "הגרסה יכולה להשתנות בכל יום." },
    capClosed: { en: "The version is pinned.", he: "הגרסה נעוצה." },
    alert: { en: "The build changed overnight and nobody touched it.", he: "הבנייה השתנתה בלילה ואף אחד לא נגע בה." },
    goal: { en: "pin the image to a fixed version.", he: "לנעוץ את התמונה לגרסה קבועה." },
  },
  language: 'dockerfile',
  vulnerableCode,
  graph: {
    nodes: [
      { id: 'reg', label: t('Image registry', 'רישום תמונות'), kind: 'registry' },
      { id: 'build', label: t('Your build', 'הבנייה שלך'), kind: 'build' },
    ],
    edges: [{ from: 'reg', to: 'build' }],
    attackPath: ['reg', 'build'],
  },
  hints: [
    t('Look at the first line. Which version does it ask for?', 'להסתכל על השורה הראשונה. איזו גרסה היא מבקשת?'),
    t('`python:latest` is not a version.', '`python:latest` היא לא גרסה.'),
    t('Use a specific tag such as `python:3.12.4-slim`.', 'להשתמש בתג מדויק כמו `python:3.12.4-slim`.'),
  ],
  check: checkPin,
  choices: [
    group('tag', ['unpinned-image'], 'FROM python:latest', [
      { id: 'full', label: t('python:3.12.4-slim', 'python:3.12.4-slim'), replace: 'FROM python:3.12.4-slim', good: true,
        why: t('An exact version builds the same way every time.', 'גרסה מדויקת נבנית אותו דבר בכל פעם.') },
      { id: 'minor', label: t('python:3.12-slim', 'python:3.12-slim'), replace: 'FROM python:3.12-slim', good: true,
        why: t('A minor line is pinned enough to stay predictable.', 'קו גרסה משני מספיק יציב כדי להיות צפוי.') },
      { id: 'major', label: t('python:3', 'python:3'), replace: 'FROM python:3', good: false,
        why: t('Major only still moves under you.', 'גרסה ראשית בלבד עדיין זזה מתחתיך.') },
      { id: "stable", label: t("Use the stable tag", "להשתמש בתג stable"), replace: 'FROM python:stable', good: false,
        why: t("That is a moving name, not a version. It can still change.", "זה שם שזז ולא גרסה. הוא עדיין יכול להשתנות.") },
      { id: "slim", label: t("Use the slim tag", "להשתמש בתג slim"), replace: 'FROM python:slim', good: false,
        why: t("Smaller, but still not a version number.", "קטן יותר, אבל עדיין לא מספר גרסה.") },
    ]),
  ],
  fix: vulnerableCode.replace('python:latest', 'python:3.12.4-slim'),
  lesson: {
    whatWasWrong: t('The base image tag was "latest".', 'תג תמונת הבסיס היה "latest".'),
    whyItMatters: t('A moving tag makes builds hard to repeat and hard to debug.', 'תג שזז הופך בנייה לקשה לשחזור ולדיבוג.'),
    bestPractice: t('Pin versions. Update them on purpose.', 'נעצו גרסאות. עדכנו אותן בכוונה.'),
  },
  realWorld: null,
};
