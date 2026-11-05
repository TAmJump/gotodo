UPDATE tasks SET done=1, by='大下甚', at='2026-11-05T03:02:00.000Z' WHERE id IN ('npo-1','npo-2');
UPDATE tasks SET d='2026-11-05' WHERE id='npo-2';
UPDATE tasks SET s='2026-11-06' WHERE id='npo-3';
INSERT OR IGNORE INTO notes(id,task_id,author,body,at,updated_at) VALUES('n-npo2-1105','npo-2','大下甚','2026年11月5日 12:02、東京都生活文化局都民生活部 小関様へメールで再提出（添付：再提出20261105.zip）','2026-11-05T03:02:00.000Z','');
INSERT OR IGNORE INTO logs(id,task_id,actor,action,detail,at) VALUES('l-1105-a','npo-1','大下甚','update','完了にした','2026-11-05T03:02:00.000Z');
INSERT OR IGNORE INTO logs(id,task_id,actor,action,detail,at) VALUES('l-1105-b','npo-2','大下甚','update','完了にした／期限：2026-11-20 → 2026-11-05','2026-11-05T03:02:00.000Z');
INSERT OR IGNORE INTO logs(id,task_id,actor,action,detail,at) VALUES('l-1105-c','npo-2','大下甚','note_add','記録を追加：東京都へメールで再提出（再提出20261105.zip）','2026-11-05T03:02:00.000Z');
