-- Table for storing conversation summaries (cross-conversation memory)
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary TEXT NOT NULL,
  key_topics TEXT[], -- Array of key topics/entities mentioned
  importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10), -- How important this conversation was
  message_count INTEGER NOT NULL, -- Number of messages summarized
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_created_at ON conversation_summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_importance ON conversation_summaries(importance_score DESC);

-- RLS Policies
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversation summaries
CREATE POLICY "Users can view their own conversation summaries"
  ON conversation_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create summaries for their conversations
CREATE POLICY "Users can create conversation summaries"
  ON conversation_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own summaries
CREATE POLICY "Users can update their own summaries"
  ON conversation_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own summaries
CREATE POLICY "Users can delete their own summaries"
  ON conversation_summaries FOR DELETE
  USING (auth.uid() = user_id);
