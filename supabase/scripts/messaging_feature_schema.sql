-- =====================================================
-- MESSAGING FEATURE DATABASE SCHEMA
-- =====================================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS message_status CASCADE;
DROP TABLE IF EXISTS user_status CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Table 1: Conversations
-- This table stores conversation metadata
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT, -- Optional title for group conversations
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Table 2: Conversation Participants
-- This table manages who is in each conversation
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'moderator')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE, -- NULL if still active
  is_muted BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique participant per conversation
  UNIQUE(conversation_id, user_id)
);

-- Table 3: Messages
-- This table stores all messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- For reply functionality
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}' -- For additional message data (file info, etc.)
);

-- Table 4: Message Status (for read receipts)
-- This table tracks message delivery and read status
CREATE TABLE message_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique status per message per user
  UNIQUE(message_id, user_id)
);

-- Table 5: User Online Status
-- This table tracks user online/offline status
CREATE TABLE user_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT FALSE,
  typing_in_conversation UUID REFERENCES conversations(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one status record per user
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_conversations_type ON conversations(type);

CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_active ON conversation_participants(conversation_id, user_id) WHERE left_at IS NULL;

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at) WHERE is_deleted = FALSE;

CREATE INDEX idx_message_status_message_id ON message_status(message_id);
CREATE INDEX idx_message_status_user_id ON message_status(user_id);
CREATE INDEX idx_message_status_status ON message_status(status);

CREATE INDEX idx_user_status_user_id ON user_status(user_id);
CREATE INDEX idx_user_status_status ON user_status(status);
CREATE INDEX idx_user_status_last_seen ON user_status(last_seen_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_status_updated_at 
  BEFORE UPDATE ON user_status 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update conversation's last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_message_trigger 
  AFTER INSERT ON messages 
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Create trigger to automatically create message status records
CREATE OR REPLACE FUNCTION create_message_status_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert status records for all participants in the conversation
  INSERT INTO message_status (message_id, user_id, status)
  SELECT NEW.id, cp.user_id, 
    CASE 
      WHEN cp.user_id = NEW.sender_id THEN 'read'
      ELSE 'sent'
    END
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id 
    AND cp.left_at IS NULL;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_message_status_records_trigger 
  AFTER INSERT ON messages 
  FOR EACH ROW EXECUTE FUNCTION create_message_status_records();

-- Create trigger to automatically create user status record when user is added to conversation
CREATE OR REPLACE FUNCTION create_user_status_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user status record if it doesn't exist
  INSERT INTO user_status (user_id, status, last_seen_at)
  VALUES (NEW.user_id, 'offline', NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_user_status_record_trigger 
  AFTER INSERT ON conversation_participants 
  FOR EACH ROW EXECUTE FUNCTION create_user_status_record();

-- Enable Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = conversations.id 
        AND cp.user_id = auth.uid() 
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "All authenticated users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation creators can update their conversations" ON conversations
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Conversation creators can delete their conversations" ON conversations
  FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
        AND cp.user_id = auth.uid() 
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "All authenticated users can join conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave conversations" ON conversation_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id 
        AND cp.user_id = auth.uid() 
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "All authenticated users can send messages to conversations they're in" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id 
        AND cp.user_id = auth.uid() 
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Create RLS policies for message_status
CREATE POLICY "Users can view message status in their conversations" ON message_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      JOIN messages m ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_status.message_id 
        AND cp.user_id = auth.uid() 
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can update their own message status" ON message_status
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message status" ON message_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message status" ON message_status
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_status
CREATE POLICY "Users can view all user status" ON user_status
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own status" ON user_status
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own status" ON user_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status" ON user_status
  FOR DELETE USING (auth.uid() = user_id);