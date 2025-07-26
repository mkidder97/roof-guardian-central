import { useEffect, useCallback, useRef } from 'react';
import { useInspectorEvents } from './useInspectorEvents';

interface AccessibilityOptions {
  announceNavigation?: boolean;
  announceActions?: boolean;
  enableKeyboardTraps?: boolean;
  enableScreenReaderOptimizations?: boolean;
}

/**
 * Accessibility hook for inspector interface
 * Provides screen reader support, keyboard navigation, and ARIA enhancements
 */
export function useAccessibility(options: AccessibilityOptions = {}) {
  const { emit, on } = useInspectorEvents();
  const announceRef = useRef<HTMLDivElement | null>(null);
  const keyboardTrapRef = useRef<HTMLElement | null>(null);
  
  const {
    announceNavigation = true,
    announceActions = true,
    enableKeyboardTraps = true,
    enableScreenReaderOptimizations = true
  } = options;

  // Create announcement element for screen readers
  useEffect(() => {
    if (!announceRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.id = 'inspector-announcer';
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    }

    return () => {
      if (announceRef.current) {
        document.body.removeChild(announceRef.current);
        announceRef.current = null;
      }
    };
  }, []);

  // Announce messages to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement to avoid repetition
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  // Set up keyboard trap for modal dialogs
  const setKeyboardTrap = useCallback((element: HTMLElement | null) => {
    keyboardTrapRef.current = element;
    
    if (element && enableKeyboardTraps) {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      element.addEventListener('keydown', handleKeyDown);
      firstElement.focus();

      return () => {
        element.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enableKeyboardTraps]);

  // Enhanced focus management
  const manageFocus = useCallback((selector: string, delay = 0) => {
    setTimeout(() => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, delay);
  }, []);

  // Skip link functionality
  const addSkipLinks = useCallback(() => {
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#property-list', text: 'Skip to property list' },
      { href: '#quick-actions', text: 'Skip to quick actions' },
    ];

    const skipContainer = document.createElement('div');
    skipContainer.className = 'skip-links';
    skipContainer.innerHTML = skipLinks
      .map(link => `
        <a 
          href="${link.href}" 
          class="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 
                 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 
                 focus:rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          ${link.text}
        </a>
      `).join('');

    document.body.insertBefore(skipContainer, document.body.firstChild);

    return () => {
      if (skipContainer.parentNode) {
        skipContainer.parentNode.removeChild(skipContainer);
      }
    };
  }, []);

  // High contrast mode detection and handling
  const handleHighContrastMode = useCallback(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const updateContrastMode = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('high-contrast');
        announce('High contrast mode enabled');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };

    updateContrastMode(mediaQuery);
    mediaQuery.addEventListener('change', updateContrastMode);

    return () => {
      mediaQuery.removeEventListener('change', updateContrastMode);
    };
  }, [announce]);

  // Reduced motion preferences
  const handleReducedMotion = useCallback(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updateMotionPreference = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('reduce-motion');
        // Disable animations and transitions
        const style = document.createElement('style');
        style.textContent = `
          .reduce-motion *, 
          .reduce-motion *::before, 
          .reduce-motion *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        `;
        document.head.appendChild(style);
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    };

    updateMotionPreference(mediaQuery);
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  // Set up event listeners for accessibility announcements
  useEffect(() => {
    if (!announceNavigation && !announceActions) return;

    const unsubscribers: (() => void)[] = [];

    if (announceNavigation) {
      unsubscribers.push(
        on('navigation.tab_changed', (event) => {
          announce(`Switched to ${event.payload.tab} tab`);
        }),
        on('property.selected', (event) => {
          announce(`Selected property: ${event.payload.propertyData?.name || 'Unknown'}`);
        }),
        on('navigation.dialog_opened', (event) => {
          announce('Dialog opened');
        }),
        on('navigation.dialog_closed', (event) => {
          announce('Dialog closed');
        })
      );
    }

    if (announceActions) {
      unsubscribers.push(
        on('inspection.started', (event) => {
          announce(`Inspection started for ${event.payload.propertyName}`, 'assertive');
        }),
        on('inspection.completed', (event) => {
          announce('Inspection completed successfully', 'assertive');
        }),
        on('photo.captured', (event) => {
          announce('Photo captured');
        }),
        on('deficiency.added', (event) => {
          announce('New deficiency documented');
        }),
        on('voice_note.started', (event) => {
          announce('Voice recording started');
        }),
        on('voice_note.stopped', (event) => {
          announce('Voice recording stopped');
        }),
        on('offline.enabled', (event) => {
          announce('Offline mode enabled. Your work will be saved locally.', 'assertive');
        }),
        on('offline.disabled', (event) => {
          announce('Back online. Syncing your work.', 'assertive');
        })
      );
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [announceNavigation, announceActions, announce, on]);

  // Initialize accessibility features
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    if (enableScreenReaderOptimizations) {
      cleanupFunctions.push(
        addSkipLinks(),
        handleHighContrastMode(),
        handleReducedMotion()
      );
    }

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup && cleanup());
    };
  }, [enableScreenReaderOptimizations, addSkipLinks, handleHighContrastMode, handleReducedMotion]);

  return {
    announce,
    setKeyboardTrap,
    manageFocus
  };
}

/**
 * Hook for specific accessibility patterns in the inspector
 */
export function useInspectorAccessibility() {
  const { announce, setKeyboardTrap, manageFocus } = useAccessibility();
  
  // Property selection accessibility
  const announcePropertySelection = useCallback((propertyName: string, criticalIssues: number) => {
    const issueText = criticalIssues > 0 ? ` with ${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''}` : '';
    announce(`Selected ${propertyName}${issueText}`);
  }, [announce]);

  // Inspection flow accessibility
  const announceInspectionStep = useCallback((step: string, details?: string) => {
    const message = details ? `${step}: ${details}` : step;
    announce(message, 'polite');
  }, [announce]);

  // Error and validation accessibility
  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive');
  }, [announce]);

  const announceValidation = useCallback((field: string, message: string) => {
    announce(`${field}: ${message}`, 'assertive');
  }, [announce]);

  // Photo capture accessibility
  const announcePhotoCapture = useCallback((location?: string, issueType?: string) => {
    let message = 'Photo captured';
    if (location) message += ` at ${location}`;
    if (issueType) message += ` for ${issueType}`;
    announce(message);
  }, [announce]);

  // Progress and status updates
  const announceProgress = useCallback((current: number, total: number, activity: string) => {
    announce(`${activity}: ${current} of ${total} completed`);
  }, [announce]);

  return {
    announce,
    setKeyboardTrap,
    manageFocus,
    announcePropertySelection,
    announceInspectionStep,
    announceError,
    announceValidation,
    announcePhotoCapture,
    announceProgress
  };
}

/**
 * Custom focus trap hook for modals and dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const trapRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    const trapElement = trapRef.current;
    if (!trapElement) return;

    const focusableElements = trapElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Close modal or dialog
        const closeButton = trapElement.querySelector('[data-close-modal]') as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    trapElement.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => {
      trapElement.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previous element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return trapRef;
}

/**
 * ARIA live region hook for dynamic content announcements
 */
export function useAriaLiveRegion(level: 'polite' | 'assertive' = 'polite') {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!regionRef.current) {
      const region = document.createElement('div');
      region.setAttribute('aria-live', level);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
      regionRef.current = region;
    }

    return () => {
      if (regionRef.current && regionRef.current.parentNode) {
        regionRef.current.parentNode.removeChild(regionRef.current);
        regionRef.current = null;
      }
    };
  }, [level]);

  const announce = useCallback((message: string) => {
    if (regionRef.current) {
      regionRef.current.textContent = message;
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return announce;
}