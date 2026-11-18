UPDATE tasks SET t='定款の事業内容の確認（定款変更はしない）', n='現行定款 第5条1(1)「医療・介護・福祉分野における支援、相談及び連携促進事業」の範囲で実施', done=1, by='大下甚', at='2026-11-18T05:40:00.000Z' WHERE id='mimoto-01';
INSERT OR IGNORE INTO logs(id,task_id,actor,action,detail,at) VALUES('l-1118c-a','mimoto-01','大下甚','update','完了にした／定款変更はせず、第5条1(1)の範囲で実施','2026-11-18T05:40:00.000Z');
