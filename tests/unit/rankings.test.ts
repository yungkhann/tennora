import { expect, it } from "vitest";
import { rankingPage } from "@/domain/rankings";
const all = Array.from({ length: 130 }, (_, i) => ({
  id: i,
  rating: 2000 - i,
  first_name: `Player ${i}`,
  last_name: "Test",
  team_name: "Club",
  gender: i % 2 ? ("girl" as const) : ("boy" as const),
  age_group: ["U13", "U15", "U17"][i % 3],
}));
it("keeps authoritative order and independently numbers each gender across pages", () => {
  for (const gender of ["boy", "girl"]) {
    const first = rankingPage(all, { gender }, "ru"),
      second = rankingPage(all, { gender, page: "2" }, "ru");
    expect(first.offset).toBe(0);
    expect(second.offset).toBe(50);
    const joined = [...first.players, ...second.players];
    expect(joined).toEqual(all.filter((p) => p.gender === gender));
    expect(new Set(joined.map((p) => p.id)).size).toBe(65);
  }
});
it("combines both gender and age filters with search without changing points", () => {
  for (const gender of ["boy", "girl"])
    for (const age of ["U13", "U15", "U17"]) {
      const result = rankingPage(all, { gender, age, q: "TEST club" }, "ru");
      expect(result.players).toEqual(
        all.filter((p) => p.gender === gender && p.age_group === age),
      );
      expect(result.offset).toBe(0);
    }
});
it("handles empty matches and invalid or out-of-range query values", () => {
  expect(
    rankingPage(all, { gender: "unknown", age: "U99", page: "-10" }, "en")
      .gender,
  ).toBe("boy");
  expect(
    rankingPage(
      all,
      { gender: "girl", age: "U13", q: "Missing", page: "999" },
      "en",
    ),
  ).toMatchObject({ page: 1, players: [] });
  expect(rankingPage(all, { gender: "girl", page: "999" }, "en").page).toBe(2);
});
