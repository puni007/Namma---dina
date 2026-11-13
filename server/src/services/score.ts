export type ScoreInputs = { completionRate: number; habitRate: number; recoveryEvents: number; activeDays: number };

export function comebackScore(input: ScoreInputs): number {
  const completion = Math.max(0, Math.min(1, input.completionRate));
  const habits = Math.max(0, Math.min(1, input.habitRate));
  const recovery = Math.max(0, Math.min(2, input.recoveryEvents)) / 2;
  const active = Math.max(0, Math.min(7, input.activeDays)) / 7;
  return Math.round(completion * 35 + habits * 30 + recovery * 20 + active * 15);
}

export const scoreExplanation = 'A weekly reflection score: 35% planned task follow-through, 30% habit targets, 20% returning to an activity after a missed day (up to two returns), and 15% days with any meaningful activity. It rewards restarting; it is not a health or scientific measure.';
