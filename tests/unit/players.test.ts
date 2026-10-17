import { describe, expect, it } from "vitest";
import {
  playerSchema,
  trainerRefSchema,
  transferSchema,
} from "@/features/players/validation";
import { trainerAssignmentSchema } from "@/features/teams/validation";
const id = "11111111-1111-4111-8111-111111111111";
describe("player mutation contracts", () => {
  it("does not accept submitted ratings, actor IDs or status", () => {
    const data = playerSchema.parse({
      id,
      club: id,
      firstName: " First ",
      lastName: " Last ",
      gender: "boy",
      dob: "2014-01-01",
      hand: "left",
      style: "attack",
      sportsLevel: "junior",
      externalId: "",
      current_rating: 9999,
      status: "active",
      actor_id: id,
    });
    expect(data.firstName).toBe("First");
    expect(data.externalId).toBeNull();
    expect(data).not.toHaveProperty("current_rating");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("actor_id");
  });
  it("requires exactly one trainer reference representation", () => {
    const base = {
      player: id,
      kind: "first",
      trainer: "",
      firstName: "Free",
      lastName: "Coach",
    };
    expect(trainerRefSchema.safeParse(base).success).toBe(true);
    expect(trainerRefSchema.safeParse({ ...base, trainer: id }).success).toBe(
      false,
    );
    expect(
      trainerRefSchema.safeParse({
        ...base,
        trainer: id,
        firstName: "",
        lastName: "",
      }).success,
    ).toBe(true);
    expect(trainerRefSchema.safeParse({ ...base, lastName: "" }).success).toBe(
      false,
    );
  });
  it("rejects duplicate subteam links and missing transfer reason", () => {
    expect(
      trainerAssignmentSchema.safeParse({
        club: id,
        trainer: id,
        subteams: [id, id],
      }).success,
    ).toBe(false);
    expect(
      transferSchema.safeParse({ player: id, club: id, reason: " " }).success,
    ).toBe(false);
  });
});
