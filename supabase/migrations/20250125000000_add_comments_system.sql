-- Communication Layer: Comments, Mentions, and Notifications
-- This migration adds a comprehensive commenting system with @mentions and notifications

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('inspection', 'property', 'work_order', 'campaign', 'report')),
  entity_id UUID NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Comment mentions table
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Comment reactions table (likes, important, resolved, etc.)
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'important', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Enhanced notifications table (extends existing if present)
DO $$ 
BEGIN
  -- Check if notifications table exists, create if not
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE TABLE notifications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      entity_type TEXT,
      entity_id UUID,
      metadata JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  ELSE
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
      ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON comment_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS (Row Level Security) policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can view comments on entities they have access to" ON comments
  FOR SELECT USING (
    -- Users can see comments on entities they have access to
    -- This would need to be customized based on your access control logic
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Comment mentions policies
CREATE POLICY "Users can view mentions they are part of" ON comment_mentions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT c.user_id FROM comments c WHERE c.id = comment_mentions.comment_id
    )
  );

CREATE POLICY "Users can create mentions when creating comments" ON comment_mentions
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT c.user_id FROM comments c WHERE c.id = comment_mentions.comment_id
    )
  );

-- Comment reactions policies
CREATE POLICY "Users can view all reactions" ON comment_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create reactions" ON comment_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" ON comment_reactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON comment_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updating updated_at on comments
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification for comment mentions
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
    comment_record comments%ROWTYPE;
    commenter_email TEXT;
BEGIN
    -- Get the comment details
    SELECT * INTO comment_record FROM comments WHERE id = NEW.comment_id;
    
    -- Get the commenter's email
    SELECT email INTO commenter_email FROM auth.users WHERE id = comment_record.user_id;
    
    -- Create notification for the mentioned user (if not the commenter)
    IF NEW.user_id != comment_record.user_id THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            entity_type,
            entity_id,
            metadata
        ) VALUES (
            NEW.user_id,
            'mention',
            commenter_email || ' mentioned you in a comment',
            LEFT(comment_record.content, 100) || CASE WHEN LENGTH(comment_record.content) > 100 THEN '...' ELSE '' END,
            comment_record.entity_type,
            comment_record.entity_id,
            jsonb_build_object(
                'comment_id', comment_record.id,
                'mentioned_by', comment_record.user_id,
                'commenter_email', commenter_email
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for creating mention notifications
DROP TRIGGER IF EXISTS trigger_mention_notification ON comment_mentions;
CREATE TRIGGER trigger_mention_notification
    AFTER INSERT ON comment_mentions
    FOR EACH ROW
    EXECUTE FUNCTION create_mention_notification();

-- Function to create notification for comment replies
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
    parent_comment comments%ROWTYPE;
    replier_email TEXT;
BEGIN
    -- Only process if this is a reply (has parent_id)
    IF NEW.parent_id IS NOT NULL THEN
        -- Get the parent comment details
        SELECT * INTO parent_comment FROM comments WHERE id = NEW.parent_id;
        
        -- Get the replier's email
        SELECT email INTO replier_email FROM auth.users WHERE id = NEW.user_id;
        
        -- Create notification for the parent comment author (if not replying to themselves)
        IF parent_comment.user_id != NEW.user_id THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                entity_type,
                entity_id,
                metadata
            ) VALUES (
                parent_comment.user_id,
                'reply',
                replier_email || ' replied to your comment',
                LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
                NEW.entity_type,
                NEW.entity_id,
                jsonb_build_object(
                    'comment_id', NEW.id,
                    'parent_comment_id', NEW.parent_id,
                    'replied_by', NEW.user_id,
                    'replier_email', replier_email
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for creating reply notifications
DROP TRIGGER IF EXISTS trigger_reply_notification ON comments;
CREATE TRIGGER trigger_reply_notification
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION create_reply_notification();

-- Grant permissions (adjust based on your auth setup)
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_mentions TO authenticated;
GRANT ALL ON comment_reactions TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;