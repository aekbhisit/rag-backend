// Type definitions for ThaiResortGuide intentions
export interface ThaiResortIntention {
  domain: 'resort';
  intent: 'explore' | 'learn' | 'decide' | 'act';
  style: 'guided' | 'quick' | 'detailed';
  fullIntention: string;
  confidence: number;
  detectedAt: number;
} 