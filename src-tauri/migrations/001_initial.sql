CREATE TABLE IF NOT EXISTS password_entries (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    website TEXT,
    email TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_entries_created_at ON password_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_password_entries_title ON password_entries(title);
