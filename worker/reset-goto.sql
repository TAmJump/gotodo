UPDATE users SET pass_hash='', salt='', must_change=1 WHERE name='後藤基温';
DELETE FROM sessions WHERE name='後藤基温';
