# Tennora product specification

Status: Task A rebaseline, 17 October 2026. Product direction is approved; implementation status is tracked in IMPLEMENTATION_PLAN.md. The previous tennis SaaS specification is preserved in archive/PHASE_1_PRODUCT_SPEC.md.

## Product

One youth table tennis league, not an organization marketplace. A club is a team with U13, U15 and U17 subteams. Target season scale is 24 clubs, 72 subteams and 360+ players. Seasons contain tours; tours contain stages; stages use round-robin, knockout or data-defined composite templates. A tournament in the interface means a tour.

Use Next.js App Router, TypeScript, Tailwind/shadcn, Supabase PostgreSQL/Auth/Storage/Realtime, Zod, Vitest and Playwright. Deployment remains Netlify-compatible. The complete revised requirements, FR-1 through FR-18, performance targets and source change log are in [REQUIREMENTS_REVISED.md](REQUIREMENTS_REVISED.md).

## Accounts and roles

Only staff authenticate. Organizers provision Organizer, Main Judge, Trainer and Line Judge accounts. Players are league records with no Auth account; spectators read public information without login. Legacy organization ownership never grants league authority. Public signup and organization creation are retired in Task B, not merely hidden in navigation.

An active Organizer manages seasons/settings/accounts and all operations. Main Judges run matches, allocate tables and replace locked players, but cannot create accounts/seasons or change settings. Trainers manage their assigned club/subteams only. Line Judges score only their table for the assigned venue-calendar day. The user confirmed coexisting staff roles (D01/C06 in DECISIONS.md). Effective permissions combine explicitly granted roles and retain resource restrictions.

## Core rules

- Birth-year eligibility, maximum 10 active players per subteam, persistent dropout history and linked-or-free-text first/personal trainers.
- Lineup slots: boy, girl, boy, girl, boy. Submit locks the lineup; opponent/public cannot read it before both sides submit. Reveal is one committed revision, not a promise of identical network arrival time.
- Only Organizer/Main Judge can replace a locked player, and only before that singles starts (C19); every replacement has a reason and audit entry. A full three-boy/two-girl lineup is required to start; later withdrawals lose their singles without automatic-loss Elo. If both teams cannot start, the match stays unresolved for the Main Judge (C12/C20).
- Each team match is up to five singles games, first to three wins. Remaining games cancel once decided. Singles are best of five sets; sets reach 11 with a two-point margin and unbounded deuce. Serving changes every two points, every point after 10:10; derive the indicator from history. Do not implement the archived tennis advantage/tie-break rules.
- Every point/undo is a versioned, idempotent command. PostgreSQL commits score, result, synchronous Elo, completion/advancement and audit atomically. Undo appends history. Completed-result correction policy is pending.
- Initial Elo defaults to 1000; automatic-loss games do not change ratings. Preserve the K used per result. Exact numerical/season aggregation proposals need the decisions listed in DECISIONS.md.
- Scheduling honors table/player exclusivity, rest and finals priority, including actual-start rechecks. Manual overrides are authorized and audited. Venue timezone governs display and judge-day assignments.

## Public experience and privacy

Russian is default/fallback; Russian, Kazakh and English are included because FR-17 requires all three. Externalize every UI string. Public pages provide live matches, timetable, draws, clubs/rosters, individual ratings/history and season standings; include a hall scoreboard and landscape judge interface.

Publish only name, team, age group, rating and consented photo. DOB, trainer contacts, draft/hidden lineups and consent evidence stay private. Keep historical results on deactivation. Public projections and Storage policies must enforce privacy independently of the UI.

## Release scope

Include staff accounts, competition configuration, roster/lineup management, match day, scoring, Elo, standings, public localization, installable web shell, auditing and operational acceptance. CSV import schema is included; importer UI/execution, payments, native apps and player accounts are excluded. Offline scoring is excluded; disconnected/stale judge controls disable writes.

Dates and capacity are acceptance targets, not current capabilities: feature freeze 23 November and release target 30 November 2026 assuming the PDF's three-person team. See TABLE_TENNIS_IMPLEMENTATION_PLAN.md for gates. Original Phase 1 auth/profile/organizations remain working legacy behavior until Task B transitions them.
