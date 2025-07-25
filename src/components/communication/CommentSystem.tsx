import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Reply, 
  MoreHorizontal,
  AtSign,
  Bell,
  Trash2,
  Edit,
  Heart,
  HeartOff,
  Pin,
  PinOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_id?: string;
  entity_type: 'inspection' | 'property' | 'work_order' | 'campaign' | 'report';
  entity_id: string;
  mentions: CommentMention[];
  reactions: CommentReaction[];
  is_pinned: boolean;
  user: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

interface CommentMention {
  id: string;
  user_id: string;
  comment_id: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface CommentReaction {
  id: string;
  user_id: string;
  comment_id: string;
  reaction_type: 'like' | 'important' | 'resolved';
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface CommentSystemProps {
  entityType: Comment['entity_type'];
  entityId: string;
  className?: string;
  showHeader?: boolean;
}

export function CommentSystem({ 
  entityType, 
  entityId, 
  className,
  showHeader = true 
}: CommentSystemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(id, email, full_name, avatar_url),
          mentions:comment_mentions(
            id,
            user_id,
            user:profiles(id, email, full_name)
          ),
          reactions:comment_reactions(
            id,
            user_id,
            reaction_type,
            user:profiles(id, email, full_name)
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Organize into threads (parent comments with replies)
      const parentComments = data.filter(c => !c.parent_id);
      const replies = data.filter(c => c.parent_id);
      
      return parentComments.map(parent => ({
        ...parent,
        replies: replies.filter(reply => reply.parent_id === parent.id)
      }));
    }
  });

  // Load users for mentions
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentId, mentions }: { 
      content: string; 
      parentId?: string;
      mentions: string[];
    }) => {
      // Create comment
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          content,
          entity_type: entityType,
          entity_id: entityId,
          parent_id: parentId,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create mentions
      if (mentions.length > 0) {
        const { error: mentionError } = await supabase
          .from('comment_mentions')
          .insert(
            mentions.map(userId => ({
              comment_id: comment.id,
              user_id: userId
            }))
          );

        if (mentionError) throw mentionError;

        // Create notifications for mentioned users
        await Promise.all(mentions.map(async (mentionedUserId) => {
          if (mentionedUserId !== user?.id) {
            await createNotificationForMention(comment.id, mentionedUserId, content);
          }
        }));
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setNewComment('');
      setReplyingTo(null);
    }
  });

  // Create notification for mention
  const createNotificationForMention = async (commentId: string, mentionedUserId: string, content: string) => {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: mentionedUserId,
        type: 'mention',
        title: `${user?.email} mentioned you`,
        message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        entity_type: entityType,
        entity_id: entityId,
        metadata: {
          comment_id: commentId,
          mentioned_by: user?.id
        }
      });

    if (error) {
      console.error('Error creating mention notification:', error);
    }
  };

  // Handle @ mentions in textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewComment(value);

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionStartPos(mentionMatch.index || 0);
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Insert mention
  const insertMention = (user: any) => {
    const beforeMention = newComment.substring(0, mentionStartPos);
    const afterCursor = newComment.substring(textareaRef.current?.selectionStart || 0);
    const newValue = beforeMention + `@${user.full_name || user.email} ` + afterCursor;
    
    setNewComment(newValue);
    setShowMentionSuggestions(false);
    textareaRef.current?.focus();
  };

  // Extract mentions from comment text
  const extractMentions = (text: string): string[] => {
    if (!users) return [];
    
    const mentionRegex = /@([\w\s@.-]+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionText = match[1].trim();
      const mentionedUser = users.find(u => 
        (u.full_name && u.full_name.includes(mentionText)) ||
        u.email.includes(mentionText)
      );
      if (mentionedUser && !mentions.includes(mentionedUser.id)) {
        mentions.push(mentionedUser.id);
      }
    }
    
    return mentions;
  };

  // Submit comment
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const mentions = extractMentions(newComment);
    createCommentMutation.mutate({ 
      content: newComment,
      parentId: replyingTo || undefined,
      mentions 
    });
  };

  // Filter users for mention suggestions
  const filteredUsers = users?.filter(u => 
    u.id !== user?.id && (
      (u.full_name && u.full_name.toLowerCase().includes(mentionQuery.toLowerCase())) ||
      u.email.toLowerCase().includes(mentionQuery.toLowerCase())
    )
  ).slice(0, 5) || [];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={cn("space-y-2", isReply && "ml-8 border-l-2 border-muted pl-4")}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user.avatar_url} />
          <AvatarFallback>
            {(comment.user.full_name || comment.user.email)
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {comment.user.full_name || comment.user.email}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>
            {comment.is_pinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
          </div>
          
          <div className="text-sm whitespace-pre-wrap break-words">
            {comment.content}
          </div>

          {comment.mentions && comment.mentions.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <AtSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Mentioned {comment.mentions.length} user{comment.mentions.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => setReplyingTo(comment.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            
            {comment.reactions && comment.reactions.length > 0 && (
              <div className="flex items-center gap-1">
                {comment.reactions.map(reaction => (
                  <Badge key={reaction.id} variant="outline" className="text-xs">
                    {reaction.reaction_type === 'like' && '👍'}
                    {reaction.reaction_type === 'important' && '⚠️'}
                    {reaction.reaction_type === 'resolved' && '✅'}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Heart className="h-3 w-3 mr-2" />
                Like
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Pin className="h-3 w-3 mr-2" />
                Pin Comment
              </Button>
              {comment.user_id === user?.id && (
                <>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-red-600">
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}

      {replyingTo === comment.id && (
        <div className="ml-11 mt-2">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              ref={textareaRef}
              placeholder={`Reply to ${comment.user.full_name || comment.user.email}...`}
              value={newComment}
              onChange={handleTextareaChange}
              className="min-h-[60px] resize-none"
            />
            
            {showMentionSuggestions && filteredUsers.length > 0 && (
              <Card className="absolute z-50 w-64 border shadow-md">
                <CardContent className="p-2">
                  {filteredUsers.map(user => (
                    <Button
                      key={user.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8"
                      onClick={() => insertMention(user)}
                    >
                      <AtSign className="h-3 w-3 mr-2" />
                      {user.full_name || user.email}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
            
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createCommentMutation.isPending}>
                <Send className="h-3 w-3 mr-1" />
                Reply
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Comments</span>
              {comments && comments.length > 0 && (
                <Badge variant="secondary">{comments.length}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {/* New Comment Form */}
        {!replyingTo && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Add a comment... Use @ to mention someone"
                value={newComment}
                onChange={handleTextareaChange}
                className="min-h-[80px] resize-none pr-12"
              />
              
              {showMentionSuggestions && filteredUsers.length > 0 && (
                <Card className="absolute z-50 w-64 border shadow-md mt-1">
                  <CardContent className="p-2">
                    {filteredUsers.map(user => (
                      <Button
                        key={user.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8"
                        onClick={() => insertMention(user)}
                      >
                        <AtSign className="h-3 w-3 mr-2" />
                        {user.full_name || user.email}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                Tip: Use @ to mention team members
              </div>
              <Button 
                type="submit" 
                size="sm" 
                disabled={!newComment.trim() || createCommentMutation.isPending}
              >
                <Send className="h-3 w-3 mr-1" />
                Comment
              </Button>
            </div>
          </form>
        )}

        {/* Comments List */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading comments...
          </div>
        ) : comments && comments.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {comments.map(comment => renderComment(comment))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
            <p className="text-xs">Be the first to add a comment!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}