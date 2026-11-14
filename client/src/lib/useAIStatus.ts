import { useQuery } from '@tanstack/react-query';
import { getData } from './api';

export type AIStatus = {
  available: boolean;
  configured: boolean;
  companionEnabled: boolean;
  featuresAvailable: { morningBriefing: boolean; quickAdd: boolean; comebackPlan: boolean; weeklyReflection: boolean };
  features: { morningBriefing: boolean; quickAdd: boolean; comebackPlan: boolean; weeklyReflection: boolean };
  dataPresent: boolean;
  dailyQuota: number;
};

export function useAIStatus() {
  return useQuery({ queryKey: ['ai-status'], queryFn: () => getData<AIStatus>('/ai/status'), staleTime: 60_000 });
}
