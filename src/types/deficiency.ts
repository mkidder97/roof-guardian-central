/**
 * Deficiency type definitions
 */

export interface Deficiency {
  id: string;
  type: string;
  category: string;
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  estimatedBudget: number;
  budgetAmount: number;
  status: 'identified' | 'in_progress' | 'resolved' | 'documented';
  photos: Photo[];
  // Critical issue management fields
  isImmediateRepair?: boolean;
  needsSupervisorAlert?: boolean;
  criticalityScore?: number; // 0-100 automated severity assessment
  detectionTimestamp?: string; // When critical issue was detected
  alertSentAt?: string; // When supervisor alert was sent
  acknowledgedAt?: string; // When supervisor acknowledged alert
  acknowledgedBy?: string; // User ID who acknowledged
}

export interface Photo {
  id: string;
  url: string;
  fileName: string;
  file: File;
  type: 'overview' | 'deficiency';
  timestamp: Date;
  size: number;
  uploadedAt: string;
  error?: string;
}

export interface CapitalExpense {
  id: string;
  type: string;
  description: string;
  estimatedBudget: number;
  timeline: string;
  priority: 'low' | 'medium' | 'high';
}