CREATE TABLE IF NOT EXISTS quota (key TEXT PRIMARY KEY, count INTEGER NOT NULL);
-- Distinct stores whose customers asked for at least one draft. hash = SHA-256(QUOTA_SALT + "store:" + Google review link); the link itself is never stored.
CREATE TABLE IF NOT EXISTS store_seen (hash TEXT PRIMARY KEY, first_day TEXT NOT NULL);
