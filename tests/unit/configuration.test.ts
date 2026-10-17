import { describe, it, expect } from "vitest";
import { buildStageTemplate } from "../../src/domain/stage-templates";
import { settingsSchema } from "../../src/features/configuration/validation";
const defaults = {
  kind: "composite" as const,
  groupCount: 4,
  groupSize: 6,
  bracketCount: 3,
  knockoutSize: 8,
};
describe("stage routing", () => {
  it("routes each of 24 source positions exactly once to the confirmed bracket bands", () => {
    const nodes = buildStageTemplate(defaults).nodes;
    expect(nodes).toHaveLength(4);
    expect(
      nodes
        .slice(1)
        .map((n) =>
          n.kind === "knockout" ? [n.size, n.place_from, n.place_to] : [],
        ),
    ).toEqual([
      [8, 1, 2],
      [8, 3, 4],
      [8, 5, 6],
    ]);
    const positions = nodes
      .slice(1)
      .flatMap((n) =>
        n.kind === "knockout"
          ? Array.from(
              { length: n.place_to! - n.place_from! + 1 },
              (_, i) => n.place_from! + i,
            )
          : [],
      );
    expect(positions).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("uses configuration data for other valid formats", () => {
    expect(
      buildStageTemplate({ ...defaults, groupCount: 2, groupSize: 3 }).nodes,
    ).toHaveLength(4);
    expect(
      buildStageTemplate({ ...defaults, kind: "round_robin" }).nodes,
    ).toHaveLength(1);
    expect(buildStageTemplate({ ...defaults, kind: "knockout" }).nodes).toEqual(
      [{ ordinal: 1, kind: "knockout", size: 8 }],
    );
  });
  it.each([
    { groupSize: 5 },
    { groupCount: 3 },
    { bracketCount: 0 },
    { knockoutSize: 6, kind: "knockout" as const },
  ])("rejects unsupported partitions or knockout sizes %o", (change) => {
    expect(() => buildStageTemplate({ ...defaults, ...change })).toThrow();
  });
});
it("rejects empty/invalid K, invalid timezone and fractional tables", () => {
  const valid = {
    id: "eeee6000-0000-4000-8000-000000000001",
    tourId: "cccc6000-0000-4000-8000-000000000001",
    revision: 0,
    k: 32,
    tables: 12,
    rest: 60,
    finals: "true",
    timezone: "Asia/Almaty",
  };
  expect(settingsSchema.safeParse(valid).success).toBe(true);
  for (const change of [
    { k: "" },
    { k: 0 },
    { k: Infinity },
    { k: NaN },
    { timezone: "Fake/Zone" },
    { tables: 1.5 },
    { rest: -1 },
  ])
    expect(settingsSchema.safeParse({ ...valid, ...change }).success).toBe(
      false,
    );
});
