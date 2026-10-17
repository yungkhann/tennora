export const lineupGenders = ["boy", "girl", "boy", "girl", "boy"] as const;
export function lineupGender(slot: number) {
  if (!Number.isInteger(slot) || slot < 1 || slot > 5)
    throw new Error("Invalid lineup slot");
  return lineupGenders[slot - 1];
}
export function distinctLineup(players: readonly string[]) {
  return (
    players.length === 5 &&
    players.every(Boolean) &&
    new Set(players).size === 5
  );
}
