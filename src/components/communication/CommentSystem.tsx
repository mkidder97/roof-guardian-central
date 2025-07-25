import React from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

interface CommentSystemProps {
  entityType: string;
  entityId: string;
  className?: string;
}

export function CommentSystem({ entityType, entityId, className }: CommentSystemProps) {
  return (
    <Card className={`p-6 text-center ${className}`}>
      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">Comments feature is currently unavailable.</p>
    </Card>
  );
}