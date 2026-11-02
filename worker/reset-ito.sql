UPDATE users SET pass_hash='', salt='', must_change=1 WHERE name='伊藤晋';
DELETE FROM sessions WHERE name='伊藤晋';
