import React from 'react';

/**
 * TooltipProvider Protection System
 * 
 * Detects and prevents nested TooltipProvider instances that cause
 * React dispatcher errors in development mode.
 */

let providerCount = 0;
let detectionInitialized = false;

const ALLOWED_TOOLTIP_FILES = [
  '/src/App.tsx',
  '/src/test/utils/test-utils.tsx',
  '/src/components/ui/tooltip.tsx'
];

/**
 * Initialize TooltipProvider protection in development mode
 */
export const initTooltipProtection = () => {
  if (!import.meta.env.DEV || detectionInitialized) return;
  
  detectionInitialized = true;
  
  // Track TooltipProvider instances
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Detect React dispatcher errors
    if (message.includes('dispatcher.useState') || 
        message.includes('Invalid hook call') ||
        message.includes('Hooks can only be called inside')) {
      
      console.group('🚨 REACT DISPATCHER ERROR DETECTED');
      console.error('❌ This is likely caused by nested TooltipProvider instances');
      console.warn('📋 SOLUTION:');
      console.warn('  1. Remove TooltipProvider from component files');
      console.warn('  2. Only use: <Tooltip>, <TooltipTrigger>, <TooltipContent>');
      console.warn('  3. TooltipProvider should ONLY exist in App.tsx and test-utils.tsx');
      console.warn('📁 Check these files for violations:');
      console.warn('  - All components using Tooltip components');
      console.warn('  - Modal/Dialog components');
      console.warn('  - Sidebar/Navigation components');
      console.groupEnd();
    }
    
    originalError.apply(console, args);
  };

  // Monitor for TooltipProvider usage in development
  if (typeof window !== 'undefined') {
    // Override React.createElement to detect TooltipProvider creation
    const originalCreateElement = React.createElement;
    
    // @ts-ignore - Development override
    React.createElement = function(type, props, ...children) {
      if (type && type.displayName === 'TooltipProvider') {
        providerCount++;
        
        if (providerCount > 2) { // Allow App.tsx and test-utils.tsx
          const stack = new Error().stack;
          const fileMatch = stack?.match(/http:\/\/[^\/]+(\/.+?):\d+:\d+/);
          const file = fileMatch ? fileMatch[1] : 'unknown';
          
          if (!ALLOWED_TOOLTIP_FILES.some(allowed => file.includes(allowed))) {
            console.group('🚨 NESTED TOOLTIPPROVIDER DETECTED');
            console.error(`❌ Forbidden TooltipProvider found in: ${file}`);
            console.warn('📋 IMMEDIATE ACTIONS:');
            console.warn('  1. Remove <TooltipProvider> from this component');
            console.warn('  2. Use only: <Tooltip>, <TooltipTrigger>, <TooltipContent>');
            console.warn('  3. Global TooltipProvider already exists in App.tsx');
            console.groupEnd();
            
            // Don't throw in production builds, just warn
            if (import.meta.env.DEV) {
              throw new Error(`Nested TooltipProvider detected in ${file}. Remove TooltipProvider - global provider already exists in App.tsx`);
            }
          }
        }
      }
      
      return originalCreateElement.call(this, type, props, ...children);
    };
  }

  console.info('🛡️ TooltipProvider protection initialized');
};

/**
 * Manual check for TooltipProvider violations
 */
export const checkTooltipProviderUsage = () => {
  return {
    providerCount,
    allowedFiles: ALLOWED_TOOLTIP_FILES,
    isViolation: providerCount > 2
  };
};

// Auto-initialize if React is available
if (typeof React !== 'undefined' && import.meta.env.DEV) {
  initTooltipProtection();
}