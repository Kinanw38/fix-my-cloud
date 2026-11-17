// Tap-to-explain terms. Every term needs both languages.
export const glossary = {
  iam: {
    en: { term: 'IAM', def: 'Identity and Access Management. The rules that say who may do what in a cloud account.' },
    he: { term: 'IAM', def: 'ניהול זהויות והרשאות. הכללים שקובעים מי רשאי לעשות מה בחשבון ענן.' },
  },
  cidr: {
    en: { term: 'CIDR', def: 'A way to write a range of IP addresses. 0.0.0.0/0 means every address.' },
    he: { term: 'CIDR', def: 'דרך לכתוב טווח של כתובות IP. 0.0.0.0/0 פירושו כל כתובת.' },
  },
  ssrf: {
    en: { term: 'SSRF', def: 'Tricking a server into sending a request on the attacker\'s behalf.' },
    he: { term: 'SSRF', def: 'לגרום לשרת לשלוח בקשה בשם התוקף.' },
  },
  securityGroup: {
    en: { term: 'Security group', def: 'The firewall of a cloud server. It lists who may connect and on which port.' },
    he: { term: 'קבוצת אבטחה', def: 'חומת האש של שרת בענן. היא קובעת מי יכול להתחבר ובאיזה פורט.' },
  },
  deletionProtection: {
    en: { term: 'Deletion protection', def: 'A setting that makes the cloud refuse to delete a resource until it is switched off.' },
    he: { term: 'הגנה מפני מחיקה', def: 'הגדרה שגורמת לענן לסרב למחוק משאב עד שמכבים אותה.' },
  },
  imds: {
    en: { term: 'Metadata service', def: 'A local address on a cloud server that hands out its own details and temporary credentials.' },
    he: { term: 'שירות מטא-דאטה', def: 'כתובת מקומית בשרת ענן שמספקת את הפרטים שלו ופרטי גישה זמניים.' },
  },
  daemonset: {
    en: { term: 'DaemonSet', def: 'A Kubernetes object that runs one copy of a pod on every matching node.' },
    he: { term: 'DaemonSet', def: 'אובייקט ב-Kubernetes שמריץ עותק אחד של pod על כל node מתאים.' },
  },
  nodeSelector: {
    en: { term: 'nodeSelector', def: 'A rule that limits a pod to nodes that carry certain labels.' },
    he: { term: 'nodeSelector', def: 'כלל שמגביל pod ל-nodes שנושאים תוויות מסוימות.' },
  },
  pullRequestTarget: {
    en: { term: 'pull_request_target', def: 'A GitHub Actions trigger that runs with the base repository\'s token, even for pull requests from strangers.' },
    he: { term: 'pull_request_target', def: 'טריגר ב-GitHub Actions שרץ עם הטוקן של הריפו הראשי, גם עבור pull requests מזרים.' },
  },
  pinning: {
    en: { term: 'Pinning', def: 'Fixing a dependency or image to an exact version so it cannot change by itself.' },
    he: { term: 'נעיצה', def: 'קיבוע תלות או תמונה לגרסה מדויקת כדי שלא תשתנה מעצמה.' },
  },
};
