UPDATE users SET pass_hash='', salt='', must_change=1 WHERE name='大下甚';
DELETE FROM sessions WHERE name='大下甚';
