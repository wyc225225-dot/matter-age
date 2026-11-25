export interface ChallengeScore {
  stars: number;
  attempts: number;
}
export function rateChallenge(
  completed: boolean,
  attempts: number,
  hints: number,
  limit: number,
): ChallengeScore | null {
  if (!completed) return null;
  return {
    stars: 1 + Number(attempts <= limit) + Number(hints === 0),
    attempts,
  };
}
export function bestChallengeScore(
  previous: ChallengeScore | undefined,
  next: ChallengeScore,
): ChallengeScore {
  return !previous ||
    next.stars > previous.stars ||
    (next.stars === previous.stars && next.attempts < previous.attempts)
    ? next
    : previous;
}
