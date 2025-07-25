-- Create comments table for the comment system
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  parent_id UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Authenticated users can view comments" 
ON public.comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid() = author_id);

-- Create comment_mentions table
CREATE TABLE public.comment_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- Create policies for comment mentions
CREATE POLICY "Authenticated users can view mentions" 
ON public.comment_mentions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create mentions" 
ON public.comment_mentions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create comment_reactions table
CREATE TABLE public.comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for comment reactions
CREATE POLICY "Authenticated users can view reactions" 
ON public.comment_reactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage their own reactions" 
ON public.comment_reactions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add missing columns to roofs table
ALTER TABLE public.roofs ADD COLUMN IF NOT EXISTS roof_age INTEGER;
ALTER TABLE public.roofs ADD COLUMN IF NOT EXISTS capital_budget NUMERIC;

-- Add trigger for updated_at on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();