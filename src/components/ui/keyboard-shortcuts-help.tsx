import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Keyboard } from 'lucide-react';
import { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onOpenChange,
  shortcuts
}) => {
  const formatKeyCombo = (shortcut: KeyboardShortcut) => {
    const keys = [];
    
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.metaKey) keys.push('Cmd');
    keys.push(shortcut.key);
    
    return keys;
  };

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const context = shortcut.context || 'global';
    if (!groups[context]) {
      groups[context] = [];
    }
    groups[context].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  const contextTitles = {
    global: 'Global Shortcuts',
    inspector: 'Inspector Interface',
    inspection: 'Active Inspection',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6">
          {Object.entries(groupedShortcuts).map(([context, contextShortcuts]) => (
            <Card key={context}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {contextTitles[context as keyof typeof contextTitles] || context}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {contextShortcuts
                    .filter(shortcut => shortcut.enabled !== false)
                    .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {formatKeyCombo(shortcut).map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && <span className="text-muted-foreground">+</span>}
                            <Badge variant="outline" className="font-mono text-xs">
                              {key}
                            </Badge>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-sm text-muted-foreground mt-4">
          <p>Press <Badge variant="outline" className="font-mono">?</Badge> to show this help dialog</p>
          <p>Press <Badge variant="outline" className="font-mono">Esc</Badge> to close dialogs</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};