export type StageNode =
  | {
      ordinal: number;
      kind: "round_robin";
      group_count: number;
      group_size: number;
    }
  | {
      ordinal: number;
      kind: "knockout";
      size: number;
      source_ordinal?: number;
      place_from?: number;
      place_to?: number;
    };
export type StageDefinition = { nodes: StageNode[] };
export type TemplateInput = {
  kind: "round_robin" | "knockout" | "composite";
  groupCount: number;
  groupSize: number;
  bracketCount: number;
  knockoutSize: number;
};
const integer = (n: number, min: number, max: number) =>
  Number.isInteger(n) && n >= min && n <= max;
const powerOfTwo = (n: number) => integer(n, 2, 1024) && (n & (n - 1)) === 0;
export function buildStageTemplate(input: TemplateInput): StageDefinition {
  const { kind, groupCount, groupSize, bracketCount, knockoutSize } = input;
  if (kind === "knockout") {
    if (!powerOfTwo(knockoutSize)) throw new Error("Invalid knockout size");
    return { nodes: [{ ordinal: 1, kind, size: knockoutSize }] };
  }
  if (
    !integer(groupCount, 1, 32) ||
    !integer(groupSize, 2, 32) ||
    groupCount * groupSize > 1024
  )
    throw new Error("Invalid groups");
  const nodes: StageNode[] = [
    {
      ordinal: 1,
      kind: "round_robin",
      group_count: groupCount,
      group_size: groupSize,
    },
  ];
  if (kind === "round_robin") return { nodes };
  const band = groupSize / bracketCount;
  if (
    kind !== "composite" ||
    !integer(bracketCount, 1, 32) ||
    !Number.isInteger(band) ||
    !powerOfTwo(groupCount * band)
  )
    throw new Error("Invalid bracket partition");
  for (let i = 0; i < bracketCount; i++)
    nodes.push({
      ordinal: i + 2,
      kind: "knockout",
      size: groupCount * band,
      source_ordinal: 1,
      place_from: i * band + 1,
      place_to: (i + 1) * band,
    });
  return { nodes };
}
