import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Reply, 
  MoreHorizontal,
  AtSign,
  Search,
  Tag,
  Pin,
  PinOff,
  Edit,
  Trash2,
  Filter,
  Smile,
  Image,
  Paperclip,
  Users,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  department?: string;
}

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
  tags: CommentTag[];
  is_pinned: boolean;
  is_edited: boolean;
  user: User;
  replies?: Comment[];
}

interface CommentMention {
  id: string;
  user_id: string;
  comment_id: string;
  user: User;
}

interface CommentReaction {
  id: string;
  user_id: string;
  comment_id: string;
  reaction_type: string;
  user: User;
}

interface CommentTag {
  id: string;
  name: string;
  color: string;
}

interface EnhancedCommentSystemProps {
  entityType: Comment['entity_type'];
  entityId: string;
  className?: string;
  showHeader?: boolean;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😊', '🎉', '👏', '⚠️', '✅', '❌'];

const DEFAULT_TAGS = [
  { id: 'urgent', name: 'Urgent', color: 'bg-red-100 text-red-800' },
  { id: 'job-update', name: 'Job Update', color: 'bg-blue-100 text-blue-800' },
  { id: 'payment', name: 'Payment', color: 'bg-green-100 text-green-800' },
  { id: 'materials', name: 'Materials', color: 'bg-purple-100 text-purple-800' },
  { id: 'scheduling', name: 'Scheduling', color: 'bg-orange-100 text-orange-800' },
  { id: 'quality', name: 'Quality', color: 'bg-yellow-100 text-yellow-800' }
];

export function EnhancedCommentSystem({ 
  entityType, 
  entityId, 
  className,
  showHeader = true 
}: EnhancedCommentSystemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  
  // @mention functionality
  const [showMentionDialog, setShowMentionDialog] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  
  // Filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load comments with enhanced data
  const { data: comments, isLoading } = useQuery({
    queryKey: ['enhanced-comments', entityType, entityId, searchQuery, selectedTag],
    queryFn: async () => {
      let query = supabase
        .from('comments')
        .select(`
          *,
          user:profiles(id, email, full_name, avatar_url, role),
          mentions:comment_mentions(
            id,
            user_id,
            user:profiles(id, email, full_name, avatar_url)
          ),
          reactions:comment_reactions(
            id,
            user_id,
            reaction_type,
            user:profiles(id, email, full_name)
          ),
          tags:comment_tags(id, name, color)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('content', `%${searchQuery}%`);
      }

      // Apply tag filter
      if (selectedTag !== 'all') {
        query = query.contains('tags', [{ name: selectedTag }]);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      
      // Organize into threads
      const parentComments = data.filter(c => !c.parent_id);
      const replies = data.filter(c => c.parent_id);
      
      return parentComments.map(parent => ({
        ...parent,
        replies: replies.filter(reply => reply.parent_id === parent.id)
      }));
    }
  });

  // Load company directory for @mentions
  const { data: companyDirectory } = useQuery({
    queryKey: ['company-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role')
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  });

  // Enhanced @mention handling
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
      setShowMentionDialog(true);
    } else {
      setShowMentionDialog(false);
    }
  };

  // Enhanced mention dialog with company directory
  const MentionDialog = () => {
    const filteredUsers = companyDirectory?.filter(user => 
      user.id !== user?.id && (
        !mentionQuery || 
        (user.full_name && user.full_name.toLowerCase().includes(mentionQuery.toLowerCase())) ||
        user.email.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    ).slice(0, 10) || [];

    const insertMention = (selectedUser: User) => {
      const beforeMention = newComment.substring(0, mentionStartPos);
      const afterCursor = newComment.substring(textareaRef.current?.selectionStart || 0);
      const newValue = beforeMention + `@${selectedUser.full_name || selectedUser.email} ` + afterCursor;
      
      setNewComment(newValue);
      setShowMentionDialog(false);
      setSelectedUsers(prev => [...prev, selectedUser]);
      textareaRef.current?.focus();
    };

    if (!showMentionDialog || filteredUsers.length === 0) return null;

    return (
      <Card className="absolute z-50 w-80 border shadow-lg mt-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Company Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Command>
            <CommandInput 
              placeholder="Search team members..." 
              value={mentionQuery}
              onValueChange={setMentionQuery}
            />
            <CommandList>
              <CommandEmpty>No team members found.</CommandEmpty>
              <CommandGroup>
                {filteredUsers.map(user => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => insertMention(user)}
                    className="flex items-center gap-3 p-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {(user.full_name || user.email)
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email} • {user.role || 'Team Member'}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </CardContent>
      </Card>
    );
  };

  // Tag selector component
  const TagSelector = ({ onTagSelect }: { onTagSelect: (tag: string) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Tag className="h-3 w-3 mr-1" />
          Tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Add Tags</h4>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_TAGS.map(tag => (
              <Button
                key={tag.id}
                variant="outline"
                size="sm"
                className="justify-start h-8"
                onClick={() => onTagSelect(tag.id)}
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", tag.color)} />
                {tag.name}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Enhanced comment rendering
  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={cn("space-y-3", isReply && "ml-8 border-l-2 border-muted pl-4")}>
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
            {comment.is_edited && (
              <Badge variant="outline" className="text-xs">Edited</Badge>
            )}
            {comment.is_pinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
          </div>
          
          {/* Tags */}
          {comment.tags && comment.tags.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {comment.tags.map(tag => (
                <Badge key={tag.id} className={cn("text-xs", tag.color)}>
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="text-sm whitespace-pre-wrap break-words mb-2">
            {comment.content}
          </div>

          {/* Mentions */}
          {comment.mentions && comment.mentions.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <AtSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Mentioned: {comment.mentions.map(m => m.user.full_name || m.user.email).join(', ')}
              </span>
            </div>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-2 mb-2">
            {comment.reactions && comment.reactions.length > 0 && (
              <div className="flex items-center gap-1">
                {EMOJI_REACTIONS.map(emoji => {
                  const reactionCount = comment.reactions?.filter(r => r.reaction_type === emoji).length || 0;
                  if (reactionCount === 0) return null;
                  
                  return (
                    <Button
                      key={emoji}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      {emoji} {reactionCount}
                    </Button>
                  );
                })}
              </div>
            )}
            
            {/* Add reaction button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1">
                  {EMOJI_REACTIONS.map(emoji => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => addReaction(comment.id, emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => setReplyingTo(comment.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <Pin className="h-3 w-3 mr-1" />
              Pin
            </Button>
          </div>
        </div>

        {/* More actions menu */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-1">
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

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}

      {/* Reply form */}
      {replyingTo === comment.id && (
        <div className="ml-11 mt-2">
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                placeholder={`Reply to ${comment.user.full_name || comment.user.email}...`}
                value={newComment}
                onChange={handleTextareaChange}
                className="min-h-[60px] resize-none pr-20"
                ref={textareaRef}
              />
              <MentionDialog />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagSelector onTagSelect={(tag) => setSelectedTags(prev => [...prev, tag])} />
                <Button variant="outline" size="sm" className="h-8">
                  <Paperclip className="h-3 w-3 mr-1" />
                  Attach
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setNewComment('');
                    setSelectedUsers([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  <Send className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const addReaction = (commentId: string, emoji: string) => {
    // Implementation for adding reactions
    console.log('Add reaction:', commentId, emoji);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Team Communication</span>
              {comments && comments.length > 0 && (
                <Badge variant="secondary">{comments.length}</Badge>
              )}
            </div>
            
            {/* Header actions */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-48"
                />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Filter className="h-3 w-3 mr-1" />
                    Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Filter by Tags</h4>
                    <div className="space-y-2">
                      <Button
                        variant={selectedTag === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSelectedTag('all')}
                      >
                        All Messages
                      </Button>
                      {DEFAULT_TAGS.map(tag => (
                        <Button
                          key={tag.id}
                          variant={selectedTag === tag.id ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setSelectedTag(tag.id)}
                        >
                          <div className={cn("w-2 h-2 rounded-full mr-2", tag.color)} />
                          {tag.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {/* New Message Form */}
        {!replyingTo && (
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                placeholder="Type your message... Use @ to mention team members"
                value={newComment}
                onChange={handleTextareaChange}
                className="min-h-[80px] resize-none pr-12"
                ref={textareaRef}
              />
              
              <MentionDialog />
              
              {/* Selected users preview */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-1 mt-2 p-2 bg-muted rounded-lg">
                  <AtSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Mentioning:</span>
                  {selectedUsers.map(user => (
                    <Badge key={user.id} variant="secondary" className="text-xs">
                      {user.full_name || user.email}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagSelector onTagSelect={(tag) => setSelectedTags(prev => [...prev, tag])} />
                <Button variant="outline" size="sm" className="h-8">
                  <Paperclip className="h-3 w-3 mr-1" />
                  Attach
                </Button>
                <Button variant="outline" size="sm" className="h-8">
                  <Image className="h-3 w-3 mr-1" />
                  Image
                </Button>
              </div>
              
              <Button 
                size="sm" 
                disabled={!newComment.trim()}
              >
                <Send className="h-3 w-3 mr-1" />
                Send Message
              </Button>
            </div>
          </div>
        )}

        {/* Messages List */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading messages...
          </div>
        ) : comments && comments.length > 0 ? (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-4">
              {comments.map(comment => renderComment(comment))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}