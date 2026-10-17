import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildStageTemplate } from "../../../src/domain/stage-templates";
import type { Database } from "../../../src/lib/supabase/database.types";
export async function drawFixture() {
  const backend = process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;
  if (new URL(backend).hostname !== "127.0.0.1" || !secret)
    throw new Error("Local fixtures only");
  const admin = createClient<Database>(backend, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    operator = createClient<Database>(
      backend,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  const token = randomUUID().slice(0, 8),
    password = `Draw!${randomUUID()}`,
    season = randomUUID(),
    tour = randomUUID(),
    template = randomUUID(),
    users: string[] = [],
    clubs: string[] = [],
    players: string[] = [];
  const emails = [
    `draw-org-${token}@example.test`,
    `draw-judge-${token}@example.test`,
    `draw-trainer-${token}@example.test`,
  ];
  function check(result: { error: unknown }) {
    if (result.error)
      throw new Error("Disposable draw fixture operation failed");
  }
  async function cleanup() {
    const errors: string[] = [];
    async function remove(
      label: string,
      operation: PromiseLike<{ error: unknown }>,
    ) {
      const result = await operation;
      if (result.error) errors.push(label);
    }
    await operator.auth.signOut();
    const plans = await admin
      .from("tour_stage_plans")
      .select("id")
      .eq("tour_id", tour);
    const planIds = (plans.data ?? []).map((v) => v.id);
    if (planIds.length) {
      const draws = await admin
          .from("draw_revisions")
          .select("id")
          .in("plan_id", planIds),
        drawIds = (draws.data ?? []).map((v) => v.id);
      if (drawIds.length) {
        const matches = await admin
            .from("team_matches")
            .select("id")
            .in("draw_id", drawIds),
          matchIds = (matches.data ?? []).map((v) => v.id);
        if (matchIds.length)
          await remove(
            "sources",
            admin.from("match_sources").delete().in("match_id", matchIds),
          );
        await remove(
          "matches",
          admin.from("team_matches").delete().in("draw_id", drawIds),
        );
        const entries = await admin
          .from("draw_entries")
          .select("id")
          .in("draw_id", drawIds);
        if (entries.data?.length)
          await remove(
            "seed players",
            admin
              .from("draw_seed_players")
              .delete()
              .in(
                "entry_id",
                entries.data.map((v) => v.id),
              ),
          );
        await remove(
          "entries",
          admin.from("draw_entries").delete().in("draw_id", drawIds),
        );
        await remove(
          "groups",
          admin.from("stage_groups").delete().in("draw_id", drawIds),
        );
        await remove(
          "draws",
          admin.from("draw_revisions").delete().in("id", drawIds),
        );
      }
      await remove(
        "stages",
        admin.from("stages").delete().in("plan_id", planIds),
      );
      await remove(
        "plans",
        admin.from("tour_stage_plans").delete().in("id", planIds),
      );
    }
    await remove(
      "snapshot",
      admin
        .from("season_configuration_snapshots")
        .delete()
        .eq("season_id", season),
    );
    await remove(
      "settings",
      admin.from("tournament_settings").delete().eq("tour_id", tour),
    );
    await remove("tour", admin.from("tours").delete().eq("id", tour));
    await remove(
      "template",
      admin.from("stage_templates").delete().eq("id", template),
    );
    await remove(
      "rosters",
      admin.from("roster_memberships").delete().eq("season_id", season),
    );
    if (players.length) {
      await remove(
        "ratings",
        admin.from("rating_history").delete().in("player_id", players),
      );
      await remove("players", admin.from("players").delete().in("id", players));
    }
    await remove(
      "registration",
      admin.from("season_team_entries").delete().eq("season_id", season),
    );
    if (clubs.length) {
      await remove(
        "subteams",
        admin.from("subteams").delete().in("team_id", clubs),
      );
      await remove("clubs", admin.from("teams").delete().in("id", clubs));
    }
    await remove("season", admin.from("seasons").delete().eq("id", season));
    if (users.length) {
      await remove(
        "audit",
        admin.from("audit_logs").delete().in("actor_id", users),
      );
      await remove(
        "roles",
        admin.from("staff_roles").delete().in("user_id", users),
      );
      await remove(
        "accounts",
        admin.from("staff_accounts").delete().in("id", users),
      );
      for (const id of users) check(await admin.auth.admin.deleteUser(id));
    }
    if (errors.length)
      throw new Error(`Draw fixture cleanup failed: ${errors.join(", ")}`);
  }
  try {
    for (let i = 0; i < 3; i++) {
      const result = await admin.auth.admin.createUser({
        email: emails[i],
        password,
        email_confirm: true,
        user_metadata: { display_name: `Draw fixture ${i}` },
      });
      check(result);
      const id = result.data.user!.id;
      users.push(id);
      check(
        await admin
          .from("staff_accounts")
          .insert({ id, email: emails[i], display_name: `Draw fixture ${i}` }),
      );
      check(
        await admin.from("staff_roles").insert({
          user_id: id,
          role: i === 0 ? "organizer" : i === 1 ? "main_judge" : "trainer",
        }),
      );
    }
    check(
      await operator.auth.signInWithPassword({ email: emails[0], password }),
    );
    check(
      await operator.rpc("save_season", {
        season_id: season,
        season_name: `Draw Season ${token}`,
        season_year: 2026,
        first_day: "2026-01-01",
        last_day: "2026-12-31",
      }),
    );
    check(
      await operator.rpc("save_tour", {
        tour_id: tour,
        parent_season: season,
        tour_name: `Draw Tournament ${token}`,
        tour_ordinal: 1,
        first_day: "2026-03-01",
        last_day: "2026-03-03",
      }),
    );
    check(
      await operator.rpc("create_stage_template", {
        template_id: template,
        template_name: `Draw Template ${token}`,
        definition: buildStageTemplate({
          kind: "composite",
          groupCount: 4,
          groupSize: 6,
          bracketCount: 3,
          knockoutSize: 8,
        }),
      }),
    );
    check(
      await operator.rpc("configure_tour_stages", {
        tournament: tour,
        template,
        age_groups: ["U13", "U15", "U17"],
      }),
    );
    check(
      await operator.rpc("save_tournament_settings", {
        settings_id: randomUUID(),
        tournament: tour,
        expected_revision: 0,
        k: 32,
        tables: 12,
        rest: 60,
        prioritize_finals: true,
        timezone_name: "Asia/Almaty",
      }),
    );
    for (let i = 0; i < 24; i++) {
      const club = randomUUID();
      clubs.push(club);
      check(
        await operator.rpc("save_team", {
          team_id: club,
          team_name: `Draw Club ${token} ${i}`,
          team_region: "Synthetic",
        }),
      );
      check(
        await operator.rpc("register_season_team", {
          parent_season: season,
          club,
        }),
      );
    }
    const subs = await admin
      .from("subteams")
      .select("id,team_id")
      .in("team_id", clubs)
      .eq("age_group", "U13");
    check(subs);
    const people: Database["public"]["Tables"]["players"]["Insert"][] = [],
      members: Database["public"]["Tables"]["roster_memberships"]["Insert"][] =
        [];
    for (const sub of subs.data!)
      for (let i = 0; i < 5; i++) {
        const id = randomUUID();
        players.push(id);
        people.push({
          id,
          team_id: sub.team_id,
          first_name: "Seed",
          last_name: `Player ${i}`,
          gender: i < 3 ? "boy" : "girl",
          date_of_birth: "2014-01-01",
          playing_hand: "right",
          playing_style: "attack",
          sports_level: "junior",
        });
        members.push({ season_id: season, subteam_id: sub.id, player_id: id });
      }
    check(await admin.from("players").insert(people));
    check(
      await admin.from("rating_history").insert(
        players.map((id) => ({
          player_id: id,
          source: "initial",
          rating_after: 1000,
        })),
      ),
    );
    check(await admin.from("roster_memberships").insert(members));
    check(await operator.rpc("start_season", { season_id: season }));
    return {
      admin,
      operator,
      token,
      password,
      emails,
      users,
      season,
      tour,
      clubs,
      players,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
