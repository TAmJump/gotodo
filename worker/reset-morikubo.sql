UPDATE users SET pass_hash='', salt='', must_change=1 WHERE name='森久保康希';
DELETE FROM sessions WHERE name='森久保康希';
