INSERT INTO tasks(id,g,t,n,s,d,owner,done,o,by,at) VALUES('npo-2b','npo','最終清書した書類を東京都庁へ郵送','2026年11月18日 郵送。メール再提出（11/5）分を最終清書','2026-11-18','2026-11-18','大下甚',1,301,'大下甚','2026-11-18T05:00:00.000Z') ON CONFLICT(id) DO UPDATE SET t=excluded.t,n=excluded.n,s=excluded.s,d=excluded.d,owner=excluded.owner,done=1,by=excluded.by,at=excluded.at;
UPDATE tasks SET s='2026-11-19', n='11/18に最終清書を郵送済み。認証は12月の見込み' WHERE id='npo-3';
UPDATE groups SET note='登記名 特定非営利活動法人 日本在宅看護普及会／所轄庁 東京都。2026年11月18日 最終清書を東京都庁へ郵送、認証待ち（12月見込み）' WHERE id='npo';
INSERT OR IGNORE INTO notes(id,task_id,author,body,at,updated_at) VALUES('n-npo2b-1118','npo-2b','大下甚','2026年11月18日、最終清書した書類を東京都庁へ郵送','2026-11-18T05:00:00.000Z','');
INSERT OR IGNORE INTO logs(id,task_id,actor,action,detail,at) VALUES('l-1118-a','npo-2b','大下甚','create','タスクを追加：最終清書した書類を東京都庁へ郵送（完了）','2026-11-18T05:00:00.000Z');
INSERT OR IGNORE INTO logs(id,task_id,actor,action,detail,at) VALUES('l-1118-b','npo-3','大下甚','update','開始日：2026-12-01 → 2026-11-19／メモ更新（認証待ち・12月見込み）','2026-11-18T05:00:00.000Z');
