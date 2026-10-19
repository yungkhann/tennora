export type RankingEntry = {
  first_name: string;
  last_name: string;
  team_name: string;
  gender: "boy" | "girl";
  age_group: string;
};
// Input is already in authoritative rating / last-name / ID order.
export function rankingPage<T extends RankingEntry>(
  all: T[],
  query: {
    gender?: string;
    age?: string;
    q?: string;
    page?: string;
  },
  locale: string,
) {
  const gender = query.gender === "girl" ? "girl" : "boy";
  const age = ["U13", "U15", "U17"].includes(query.age ?? "") ? query.age! : "";
  const q = (query.q ?? "").slice(0, 80).trim();
  const found = all.filter(
    (p) =>
      p.gender === gender &&
      (!age || p.age_group === age) &&
      `${p.first_name} ${p.last_name} ${p.team_name}`
        .toLocaleLowerCase(locale)
        .includes(q.toLocaleLowerCase(locale)),
  );
  const page = Math.max(
    1,
    Math.min(
      Math.ceil(found.length / 50) || 1,
      Number.parseInt(query.page ?? "1", 10) || 1,
    ),
  );
  const offset = (page - 1) * 50;
  return {
    gender,
    age,
    q,
    found,
    page,
    offset,
    players: found.slice(offset, offset + 50),
  };
}
