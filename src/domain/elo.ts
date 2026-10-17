export function eloPair(
  a: number,
  b: number,
  winner: "a" | "b",
  k: number,
  automatic = false,
) {
  if (
    ![a, b].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    !Number.isFinite(k) ||
    k <= 0 ||
    k > Number.MAX_SAFE_INTEGER ||
    (winner !== "a" && winner !== "b")
  )
    throw new Error("Invalid Elo inputs");
  if (automatic) return { a, b };
  const expected = 1 / (1 + 10 ** ((b - a) / 400));
  const score = winner === "a" ? 1 : 0;
  const delta = k * (score - expected);
  const nextA = Math.max(0, a + Math.round(delta)),
    nextB = Math.max(0, b + Math.round(-delta));
  if (!Number.isSafeInteger(nextA) || !Number.isSafeInteger(nextB))
    throw new Error("Elo exceeds integer precision");
  return { a: nextA, b: nextB };
}
