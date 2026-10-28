-- Migration 012: Facebook Page Comments Management
CREATE TABLE IF NOT EXISTS comment_events (
  id SERIAL PRIMARY KEY,
  comment_id VARCHAR(100) UNIQUE NOT NULL,
  post_id VARCHAR(100),
  from_id VARCHAR(100),
  category VARCHAR(50),
  status VARCHAR(50) DEFAULT 'received',
  complaint_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_events_comment_id ON comment_events(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_events_category ON comment_events(category);
CREATE INDEX IF NOT EXISTS idx_comment_events_created_at ON comment_events(created_at);
