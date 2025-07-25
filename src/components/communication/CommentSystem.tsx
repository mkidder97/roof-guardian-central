import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CommentSystemProps {
  entityType: 'inspection' | 'property' | 'work_order' | 'campaign' | 'report';
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
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Comments</span>
              <Badge variant="secondary">0</Badge>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        <div className="p-4 text-center text-sm text-muted-foreground">
          Comment system temporarily disabled due to database schema migration.
          <br />
          Comments will be restored after the migration is complete.
        </div>
      </CardContent>
    </Card>
  );
}

export default CommentSystem;