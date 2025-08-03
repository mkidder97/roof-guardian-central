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
  status: 'identified' | 'in_progress' | 'resolved';
  photos: Photo[];
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