import React, { Component, createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { monitoringService } from './MonitoringService';

interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  trigger: {
    errorPattern?: RegExp;
    performanceThreshold?: number;
    healthStatus?: 'unhealthy' | 'degraded';
    consecutive?: number;
  };
  action: 'reload' | 'remount' | 'reset' | 'custom';
  customAction?: () => Promise<boolean>;
  cooldown: number; // minutes
  enabled: boolean;
  priority: number; // higher = more priority
}

interface RecoveryContext {
  registerRecovery: (componentName: string, actions: RecoveryAction[]) => void;
  unregisterRecovery: (componentName: string) => void;
  triggerRecovery: (componentName: string, actionId?: string) => Promise<boolean>;
  getRecoveryHistory: (componentName?: string) => RecoveryAttempt[];
}

interface RecoveryAttempt {
  id: string;
  componentName: string;
  actionId: string;
  actionName: string;
  timestamp: string;
  success: boolean;
  error?: string;
  metrics?: any;
}

const RecoveryContext = createContext<RecoveryContext | null>(null);

// Default recovery actions for common React issues
const DEFAULT_RECOVERY_ACTIONS: RecoveryAction[] = [
  {
    id: 'hooks-violation-remount',
    name: 'Remount Component',
    description: 'Remount component to reset hook state',
    trigger: {
      errorPattern: /hooks?.*call|invalid hook call|rendered (more|fewer) hooks/i,
      consecutive: 1
    },
    action: 'remount',
    cooldown: 1,
    enabled: true,
    priority: 10
  },
  {
    id: 'slow-render-reset',
    name: 'Reset Component State',
    description: 'Reset component state to improve performance',
    trigger: {
      performanceThreshold: 100,
      consecutive: 3
    },
    action: 'reset',
    cooldown: 5,
    enabled: true,
    priority: 5
  },
  {
    id: 'memory-leak-reload',
    name: 'Reload Component',
    description: 'Reload component to free memory',
    trigger: {
      performanceThreshold: 200 * 1024 * 1024, // 200MB
      consecutive: 2
    },
    action: 'reload',
    cooldown: 10,
    enabled: true,
    priority: 8
  },
  {
    id: 'unhealthy-component-reset',
    name: 'Health Recovery Reset',
    description: 'Reset component when health status is unhealthy',
    trigger: {
      healthStatus: 'unhealthy',
      consecutive: 2
    },
    action: 'reset',
    cooldown: 5,
    enabled: true,
    priority: 7
  }
];

class AutoRecoveryManager {
  private registeredComponents = new Map<string, RecoveryAction[]>();
  private recoveryHistory: RecoveryAttempt[] = [];
  private lastRecoveryAttempts = new Map<string, Map<string, number>>();
  private consecutiveIssues = new Map<string, Map<string, number>>();
  private maxHistorySize = 1000;

  constructor() {
    this.setupMonitoringListeners();
  }

  private setupMonitoringListeners() {
    monitoringService.subscribe((event) => {
      switch (event.type) {
        case 'error':
        case 'hooksError':
          this.handleError(event.data);
          break;
        case 'performance':
          this.handlePerformanceIssue(event.data);
          break;
        case 'health':
          this.handleHealthIssue(event.data);
          break;
      }
    });
  }

  registerComponent(componentName: string, actions: RecoveryAction[] = DEFAULT_RECOVERY_ACTIONS) {
    this.registeredComponents.set(componentName, actions);
    console.log(`🔧 Auto-recovery registered for ${componentName} with ${actions.length} actions`);
  }

  unregisterComponent(componentName: string) {
    this.registeredComponents.delete(componentName);
    this.lastRecoveryAttempts.delete(componentName);
    this.consecutiveIssues.delete(componentName);
    console.log(`🔧 Auto-recovery unregistered for ${componentName}`);
  }

  private handleError(error: any) {
    const componentName = error.componentName || 'Unknown';
    const actions = this.registeredComponents.get(componentName);
    if (!actions) return;

    // Find matching recovery actions
    const matchingActions = actions.filter(action => {
      if (!action.enabled) return false;
      if (action.trigger.errorPattern) {
        return action.trigger.errorPattern.test(error.message || '') ||
               action.trigger.errorPattern.test(error.stack || '');
      }
      return false;
    });

    if (matchingActions.length > 0) {
      this.checkAndTriggerRecovery(componentName, matchingActions, 'error');
    }
  }

  private handlePerformanceIssue(metric: any) {
    const componentName = metric.componentName;
    const actions = this.registeredComponents.get(componentName);
    if (!actions) return;

    // Find matching recovery actions
    const matchingActions = actions.filter(action => {
      if (!action.enabled) return false;
      if (action.trigger.performanceThreshold) {
        return metric.value > action.trigger.performanceThreshold;
      }
      return false;
    });

    if (matchingActions.length > 0) {
      this.checkAndTriggerRecovery(componentName, matchingActions, 'performance');
    }
  }

  private handleHealthIssue(health: any) {
    const componentName = health.componentName;
    const actions = this.registeredComponents.get(componentName);
    if (!actions) return;

    // Find matching recovery actions
    const matchingActions = actions.filter(action => {
      if (!action.enabled) return false;
      if (action.trigger.healthStatus) {
        return health.status === action.trigger.healthStatus;
      }
      return false;
    });

    if (matchingActions.length > 0) {
      this.checkAndTriggerRecovery(componentName, matchingActions, 'health');
    }
  }

  private checkAndTriggerRecovery(componentName: string, actions: RecoveryAction[], triggerType: string) {
    const now = Date.now();
    
    // Sort actions by priority
    const sortedActions = actions.sort((a, b) => b.priority - a.priority);

    for (const action of sortedActions) {
      // Check cooldown
      const lastAttempt = this.getLastAttemptTime(componentName, action.id);
      if (lastAttempt && (now - lastAttempt) < (action.cooldown * 60 * 1000)) {
        continue;
      }

      // Check consecutive requirement
      if (action.trigger.consecutive && action.trigger.consecutive > 1) {
        const consecutiveCount = this.incrementConsecutiveCount(componentName, action.id);
        if (consecutiveCount < action.trigger.consecutive) {
          continue;
        }
      }

      // Trigger recovery
      this.executeRecovery(componentName, action, triggerType);
      break; // Only execute one recovery action at a time
    }
  }

  private getLastAttemptTime(componentName: string, actionId: string): number | undefined {
    const componentAttempts = this.lastRecoveryAttempts.get(componentName);
    return componentAttempts?.get(actionId);
  }

  private incrementConsecutiveCount(componentName: string, actionId: string): number {
    if (!this.consecutiveIssues.has(componentName)) {
      this.consecutiveIssues.set(componentName, new Map());
    }
    const componentIssues = this.consecutiveIssues.get(componentName)!;
    const current = componentIssues.get(actionId) || 0;
    const updated = current + 1;
    componentIssues.set(actionId, updated);
    return updated;
  }

  private resetConsecutiveCount(componentName: string, actionId: string) {
    const componentIssues = this.consecutiveIssues.get(componentName);
    if (componentIssues) {
      componentIssues.set(actionId, 0);
    }
  }

  async executeRecovery(componentName: string, action: RecoveryAction, triggerType: string): Promise<boolean> {
    const attemptId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    console.log(`🔧 Executing recovery action "${action.name}" for ${componentName} (trigger: ${triggerType})`);

    try {
      let success = false;

      switch (action.action) {
        case 'remount':
          success = await this.remountComponent(componentName);
          break;
        case 'reset':
          success = await this.resetComponent(componentName);
          break;
        case 'reload':
          success = await this.reloadComponent(componentName);
          break;
        case 'custom':
          if (action.customAction) {
            success = await action.customAction();
          }
          break;
      }

      const endTime = performance.now();
      const attempt: RecoveryAttempt = {
        id: attemptId,
        componentName,
        actionId: action.id,
        actionName: action.name,
        timestamp: new Date().toISOString(),
        success,
        metrics: {
          triggerType,
          executionTime: endTime - startTime
        }
      };

      this.recordRecoveryAttempt(componentName, action.id, attempt);

      if (success) {
        this.resetConsecutiveCount(componentName, action.id);
        monitoringService.reportPerformanceMetric({
          id: `recovery_success_${Date.now()}`,
          componentName,
          metricType: 'operation',
          value: endTime - startTime,
          timestamp: new Date().toISOString(),
          metadata: {
            actionName: action.name,
            triggerType,
            success: true
          }
        });
      }

      return success;
    } catch (error) {
      const attempt: RecoveryAttempt = {
        id: attemptId,
        componentName,
        actionId: action.id,
        actionName: action.name,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      this.recordRecoveryAttempt(componentName, action.id, attempt);
      console.error(`🔧 Recovery action failed for ${componentName}:`, error);
      return false;
    }
  }

  private recordRecoveryAttempt(componentName: string, actionId: string, attempt: RecoveryAttempt) {
    this.recoveryHistory.push(attempt);
    
    // Trim history if needed
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory = this.recoveryHistory.slice(-this.maxHistorySize);
    }

    // Update last attempt time
    if (!this.lastRecoveryAttempts.has(componentName)) {
      this.lastRecoveryAttempts.set(componentName, new Map());
    }
    this.lastRecoveryAttempts.get(componentName)!.set(actionId, Date.now());
  }

  private async remountComponent(componentName: string): Promise<boolean> {
    // Trigger a remount event
    const event = new CustomEvent('component-remount', { 
      detail: { componentName } 
    });
    window.dispatchEvent(event);
    
    // Wait a bit for the remount to take effect
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  private async resetComponent(componentName: string): Promise<boolean> {
    // Trigger a reset event
    const event = new CustomEvent('component-reset', { 
      detail: { componentName } 
    });
    window.dispatchEvent(event);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    return true;
  }

  private async reloadComponent(componentName: string): Promise<boolean> {
    // Trigger a reload event
    const event = new CustomEvent('component-reload', { 
      detail: { componentName } 
    });
    window.dispatchEvent(event);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
  }

  getRecoveryHistory(componentName?: string): RecoveryAttempt[] {
    if (componentName) {
      return this.recoveryHistory.filter(attempt => attempt.componentName === componentName);
    }
    return [...this.recoveryHistory];
  }

  async triggerManualRecovery(componentName: string, actionId?: string): Promise<boolean> {
    const actions = this.registeredComponents.get(componentName);
    if (!actions) {
      console.warn(`No recovery actions registered for ${componentName}`);
      return false;
    }

    let targetAction: RecoveryAction | undefined;
    if (actionId) {
      targetAction = actions.find(a => a.id === actionId);
      if (!targetAction) {
        console.warn(`Recovery action ${actionId} not found for ${componentName}`);
        return false;
      }
    } else {
      // Use highest priority enabled action
      targetAction = actions
        .filter(a => a.enabled)
        .sort((a, b) => b.priority - a.priority)[0];
    }

    if (!targetAction) {
      console.warn(`No enabled recovery actions available for ${componentName}`);
      return false;
    }

    return await this.executeRecovery(componentName, targetAction, 'manual');
  }

  getRegisteredComponents(): string[] {
    return Array.from(this.registeredComponents.keys());
  }

  getComponentActions(componentName: string): RecoveryAction[] {
    return this.registeredComponents.get(componentName) || [];
  }
}

const recoveryManager = new AutoRecoveryManager();

// Provider component
interface AutoRecoveryProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const AutoRecoveryProvider: React.FC<AutoRecoveryProviderProps> = ({ 
  children, 
  enabled = true 
}) => {
  const contextValue: RecoveryContext = {
    registerRecovery: (componentName, actions) => {
      if (enabled) {
        recoveryManager.registerComponent(componentName, actions);
      }
    },
    unregisterRecovery: (componentName) => {
      recoveryManager.unregisterComponent(componentName);
    },
    triggerRecovery: (componentName, actionId) => {
      return recoveryManager.triggerManualRecovery(componentName, actionId);
    },
    getRecoveryHistory: (componentName) => {
      return recoveryManager.getRecoveryHistory(componentName);
    }
  };

  return (
    <RecoveryContext.Provider value={contextValue}>
      {children}
    </RecoveryContext.Provider>
  );
};

// Hook for components to use auto-recovery
export const useAutoRecovery = (
  componentName: string, 
  customActions: RecoveryAction[] = []
) => {
  const context = useContext(RecoveryContext);
  const [remountKey, setRemountKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const mountedRef = useRef(true);

  const actions = [...DEFAULT_RECOVERY_ACTIONS, ...customActions];

  useEffect(() => {
    context?.registerRecovery(componentName, actions);

    return () => {
      context?.unregisterRecovery(componentName);
    };
  }, [componentName, actions, context]);

  // Listen for recovery events
  useEffect(() => {
    const handleRemount = (event: CustomEvent) => {
      if (event.detail.componentName === componentName) {
        setRemountKey(prev => prev + 1);
      }
    };

    const handleReset = (event: CustomEvent) => {
      if (event.detail.componentName === componentName) {
        setResetKey(prev => prev + 1);
      }
    };

    const handleReload = (event: CustomEvent) => {
      if (event.detail.componentName === componentName) {
        // For reload, we might want to trigger a full component refresh
        setRemountKey(prev => prev + 1);
        setResetKey(prev => prev + 1);
      }
    };

    window.addEventListener('component-remount', handleRemount as EventListener);
    window.addEventListener('component-reset', handleReset as EventListener);
    window.addEventListener('component-reload', handleReload as EventListener);

    return () => {
      window.removeEventListener('component-remount', handleRemount as EventListener);
      window.removeEventListener('component-reset', handleReset as EventListener);
      window.removeEventListener('component-reload', handleReload as EventListener);
    };
  }, [componentName]);

  const triggerRecovery = useCallback(async (actionId?: string) => {
    return await context?.triggerRecovery(componentName, actionId) || false;
  }, [componentName, context]);

  const getRecoveryHistory = useCallback(() => {
    return context?.getRecoveryHistory(componentName) || [];
  }, [componentName, context]);

  return {
    remountKey,
    resetKey,
    triggerRecovery,
    getRecoveryHistory,
    isMounted: mountedRef.current
  };
};

// HOC for automatic recovery
export const withAutoRecovery = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    componentName?: string;
    customActions?: RecoveryAction[];
  } = {}
) => {
  return function AutoRecoveryComponent(props: P) {
    const componentName = options.componentName || Component.displayName || Component.name || 'Component';
    const { remountKey, resetKey } = useAutoRecovery(componentName, options.customActions);

    return (
      <Component
        key={`${componentName}_${remountKey}_${resetKey}`}
        {...props}
      />
    );
  };
};

export { recoveryManager, DEFAULT_RECOVERY_ACTIONS };
export type { RecoveryAction, RecoveryAttempt };