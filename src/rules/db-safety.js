// INC-0004: a production database needs protection, backups and a final snapshot.
import { guard, result, fail, toLines, findBlocks, attrsOf } from './common.js';

export function check(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hcl');
  const [db] = findBlocks(lines, /^\s*resource\s+"aws_db_instance"\s+"[^"]*"\s*\{/);
  if (!db) {
    return result([fail('missing-db-instance', 0, 'No aws_db_instance resource found', 'לא נמצא משאב aws_db_instance')]);
  }
  const a = attrsOf(lines, db.start + 1, db.end);
  const at = (k) => a.get(k)?.line ?? db.start + 1;
  const failures = [];
  if (!a.has('engine')) failures.push(fail('engine-removed', db.start + 1, 'The database engine is missing', 'חסר מנוע בסיס הנתונים'));
  if (a.get('deletion_protection')?.value !== 'true') {
    failures.push(fail('deletion-protection', at('deletion_protection'), 'Deletion protection is off', 'הגנה מפני מחיקה כבויה'));
  }
  if (!(Number(a.get('backup_retention_period')?.value) >= 7)) {
    failures.push(fail('backup-retention', at('backup_retention_period'), 'Backups are kept less than 7 days', 'הגיבויים נשמרים פחות מ-7 ימים'));
  }
  if (a.get('skip_final_snapshot')?.value !== 'false') {
    failures.push(fail('final-snapshot', at('skip_final_snapshot'), 'No final snapshot on delete', 'אין snapshot אחרון בעת מחיקה'));
  } else if (!a.get('final_snapshot_identifier')?.value) {
    failures.push(fail('final-snapshot', at('skip_final_snapshot'), 'A final snapshot needs a final_snapshot_identifier', 'snapshot אחרון דורש final_snapshot_identifier'));
  }
  const [life] = findBlocks(lines, /^\s*lifecycle\s*\{/, db.start + 1, db.end);
  const guarded = life && attrsOf(lines, life.start + 1, life.end).get('prevent_destroy')?.value === 'true';
  if (!guarded) {
    failures.push(fail('prevent-destroy', life ? life.start + 1 : db.start + 1, 'No lifecycle prevent_destroy guard', 'אין מגן lifecycle מסוג prevent_destroy'));
  }
  return result(failures);
}
