import { useEffect, useCallback, useRef } from 'react';
import { useInspectorEvents } from './useInspectorEvents';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
  context?: string; // Context where shortcut is active
}

/**
 * Hook for managing keyboard shortcuts in the inspector interface
 * Inspired by Google Maps keyboard navigation patterns
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const { emit } = useInspectorEvents();
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);
  const contextRef = useRef<string>('global');

  // Update shortcuts when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const activeShortcuts = shortcutsRef.current.filter(shortcut => {
      // Check if shortcut is enabled
      if (shortcut.enabled === false) return false;
      
      // Check context (if specified)
      if (shortcut.context && shortcut.context !== contextRef.current) return false;
      
      // Check key combination
      return (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!event.ctrlKey === !!shortcut.ctrlKey &&
        !!event.shiftKey === !!shortcut.shiftKey &&
        !!event.altKey === !!shortcut.altKey &&
        !!event.metaKey === !!shortcut.metaKey
      );
    });

    if (activeShortcuts.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      
      // Execute the first matching shortcut
      const shortcut = activeShortcuts[0];
      try {
        shortcut.action();
        
        // Emit event for tracking
        emit('keyboard.shortcut_triggered', {
          shortcut: shortcut.key,
          description: shortcut.description,
          context: contextRef.current
        }, 'keyboard_manager');
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error);
      }
    }
  }, [emit]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const setContext = useCallback((context: string) => {
    contextRef.current = context;
  }, []);

  const getActiveShortcuts = useCallback(() => {
    return shortcutsRef.current.filter(s => s.enabled !== false);
  }, []);

  return {
    setContext,
    getActiveShortcuts
  };
}

/**
 * Pre-defined keyboard shortcuts for the inspector interface
 */
export function useInspectorKeyboardShortcuts() {
  const { emit } = useInspectorEvents();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'Escape',
      description: 'Close current dialog or cancel current action',
      action: () => emit('navigation.dialog_closed', { reason: 'keyboard' }),
      context: 'global'
    },
    {
      key: '/',
      description: 'Open command palette',
      action: () => emit('navigation.command_palette_opened', {}),
      context: 'global'
    },
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts help',
      action: () => emit('navigation.help_opened', { section: 'shortcuts' }),
      context: 'global'
    },

    // Tab navigation
    {
      key: '1',
      ctrlKey: true,
      description: 'Switch to Briefing tab',
      action: () => emit('navigation.tab_changed', { tab: 'briefing' }),
      context: 'inspector'
    },
    {
      key: '2',
      ctrlKey: true,
      description: 'Switch to Pattern Analysis tab',
      action: () => emit('navigation.tab_changed', { tab: 'patterns' }),
      context: 'inspector'
    },
    {
      key: '3',
      ctrlKey: true,
      description: 'Switch to Historical Photos tab',
      action: () => emit('navigation.tab_changed', { tab: 'photos' }),
      context: 'inspector'
    },
    {
      key: '4',
      ctrlKey: true,
      description: 'Switch to Field Notes tab',
      action: () => emit('navigation.tab_changed', { tab: 'notes' }),
      context: 'inspector'
    },

    // Inspection actions
    {
      key: 's',
      ctrlKey: true,
      description: 'Start inspection',
      action: () => emit('inspection.start_requested', {}),
      context: 'inspector'
    },
    {
      key: 'p',
      ctrlKey: true,
      description: 'Pause/Resume inspection',
      action: () => emit('inspection.pause_toggle_requested', {}),
      context: 'inspection'
    },
    {
      key: 'Enter',
      ctrlKey: true,
      description: 'Complete inspection',
      action: () => emit('inspection.complete_requested', {}),
      context: 'inspection'
    },

    // Photo and media shortcuts
    {
      key: 'c',
      ctrlKey: true,
      description: 'Capture photo',
      action: () => emit('photo.capture_requested', {}),
      context: 'inspection'
    },
    {
      key: 'v',
      ctrlKey: true,
      description: 'Start/Stop voice note',
      action: () => emit('voice_note.toggle_requested', {}),
      context: 'inspection'
    },

    // Deficiency management
    {
      key: 'd',
      ctrlKey: true,
      description: 'Add new deficiency',
      action: () => emit('deficiency.add_requested', {}),
      context: 'inspection'
    },

    // Quick actions
    {
      key: 'r',
      ctrlKey: true,
      description: 'Refresh current view',
      action: () => emit('navigation.refresh_requested', {}),
      context: 'global'
    },
    {
      key: 'f',
      ctrlKey: true,
      description: 'Open search/filter',
      action: () => emit('navigation.search_opened', {}),
      context: 'global'
    },

    // Property navigation
    {
      key: 'ArrowUp',
      ctrlKey: true,
      description: 'Select previous property',
      action: () => emit('property.navigate', { direction: 'previous' }),
      context: 'inspector'
    },
    {
      key: 'ArrowDown',
      ctrlKey: true,
      description: 'Select next property',
      action: () => emit('property.navigate', { direction: 'next' }),
      context: 'inspector'
    },

    // Save and export
    {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      description: 'Save and export report',
      action: () => emit('inspection.export_requested', {}),
      context: 'inspection'
    }
  ];

  const { setContext, getActiveShortcuts } = useKeyboardShortcuts(shortcuts);

  return {
    setContext,
    getActiveShortcuts,
    shortcuts
  };
}