export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      active_score_points: {
        Row: {
          event_id: string;
          event_version: number;
          game_id: string;
          set_number: number;
          side: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          event_version: number;
          game_id: string;
          set_number: number;
          side: string;
        };
        Update: {
          event_id?: string;
          event_version?: number;
          game_id?: string;
          set_number?: number;
          side?: string;
        };
        Relationships: [
          {
            foreignKeyName: "active_score_points_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "score_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "active_score_points_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["staff_role"] | null;
          after_state: Json | null;
          before_state: Json | null;
          created_at: string;
          details: NonNullable<Json>;
          entity_id: string;
          entity_type: string | null;
          id: string;
          organization_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["staff_role"] | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          details?: NonNullable<Json>;
          entity_id: string;
          entity_type?: string | null;
          id?: string;
          organization_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["staff_role"] | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          details?: NonNullable<Json>;
          entity_id?: string;
          entity_type?: string | null;
          id?: string;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      correction_attempts: {
        Row: {
          created_at: string;
          new_match_id: string;
          old_match_id: string;
          original: NonNullable<Json>;
          request_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          new_match_id: string;
          old_match_id: string;
          original: NonNullable<Json>;
          request_id: string;
        };
        Update: {
          created_at?: string;
          new_match_id?: string;
          old_match_id?: string;
          original?: NonNullable<Json>;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "correction_attempts_new_match_id_fkey";
            columns: ["new_match_id"];
            isOneToOne: true;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "correction_attempts_old_match_id_fkey";
            columns: ["old_match_id"];
            isOneToOne: true;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "correction_attempts_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "result_correction_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      draw_entries: {
        Row: {
          draw_id: string;
          group_id: string | null;
          group_slot: number | null;
          id: string;
          rating_total: number;
          seed: number;
          subteam_id: string;
          tie_lot: string;
        };
        ComputedFields: never;
        Insert: {
          draw_id: string;
          group_id?: string | null;
          group_slot?: number | null;
          id?: string;
          rating_total: number;
          seed: number;
          subteam_id: string;
          tie_lot: string;
        };
        Update: {
          draw_id?: string;
          group_id?: string | null;
          group_slot?: number | null;
          id?: string;
          rating_total?: number;
          seed?: number;
          subteam_id?: string;
          tie_lot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draw_entries_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draw_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_entries_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "stage_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_entries_subteam_id_fkey";
            columns: ["subteam_id"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
        ];
      };
      draw_revisions: {
        Row: {
          generated_at: string;
          generated_by: string;
          id: string;
          mapping_snapshot: NonNullable<Json>;
          plan_id: string;
          published_at: string | null;
          published_by: string | null;
          revision: number;
        };
        ComputedFields: never;
        Insert: {
          generated_at?: string;
          generated_by: string;
          id: string;
          mapping_snapshot: NonNullable<Json>;
          plan_id: string;
          published_at?: string | null;
          published_by?: string | null;
          revision: number;
        };
        Update: {
          generated_at?: string;
          generated_by?: string;
          id?: string;
          mapping_snapshot?: NonNullable<Json>;
          plan_id?: string;
          published_at?: string | null;
          published_by?: string | null;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "draw_revisions_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_revisions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "tour_stage_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_revisions_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      draw_seed_adjustments: {
        Row: {
          created_at: string;
          created_by: string;
          draw_id: string;
          reason: string;
          seed_a: number;
          seed_b: number;
          source_draw_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          draw_id: string;
          reason: string;
          seed_a: number;
          seed_b: number;
          source_draw_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          draw_id?: string;
          reason?: string;
          seed_a?: number;
          seed_b?: number;
          source_draw_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draw_seed_adjustments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_seed_adjustments_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: true;
            referencedRelation: "draw_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_seed_adjustments_source_draw_id_fkey";
            columns: ["source_draw_id"];
            isOneToOne: false;
            referencedRelation: "draw_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      draw_seed_maps: {
        Row: {
          group_count: number;
          id: string;
          qualifiers_per_group: number;
          slots: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          group_count: number;
          id: string;
          qualifiers_per_group: number;
          slots: NonNullable<Json>;
        };
        Update: {
          group_count?: number;
          id?: string;
          qualifiers_per_group?: number;
          slots?: NonNullable<Json>;
        };
        Relationships: [];
      };
      draw_seed_players: {
        Row: {
          entry_id: string;
          gender: Database["public"]["Enums"]["player_gender"];
          player_id: string;
          rating: number;
        };
        ComputedFields: never;
        Insert: {
          entry_id: string;
          gender: Database["public"]["Enums"]["player_gender"];
          player_id: string;
          rating: number;
        };
        Update: {
          entry_id?: string;
          gender?: Database["public"]["Enums"]["player_gender"];
          player_id?: string;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "draw_seed_players_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "draw_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_seed_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_seed_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      game_sets: {
        Row: {
          first_server: string;
          game_id: string;
          points_a: number;
          points_b: number;
          set_number: number;
          winner: string | null;
        };
        ComputedFields: never;
        Insert: {
          first_server: string;
          game_id: string;
          points_a: number;
          points_b: number;
          set_number: number;
          winner?: string | null;
        };
        Update: {
          first_server?: string;
          game_id?: string;
          points_a?: number;
          points_b?: number;
          set_number?: number;
          winner?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "game_sets_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
        ];
      };
      group_standing_heads: {
        Row: {
          group_id: string;
          snapshot_id: string;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          snapshot_id: string;
        };
        Update: {
          group_id?: string;
          snapshot_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_standing_heads_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: true;
            referencedRelation: "stage_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_standing_heads_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "group_standing_snapshots";
            referencedColumns: ["id"];
          },
        ];
      };
      group_standing_snapshots: {
        Row: {
          complete: boolean;
          created_at: string;
          created_by: string;
          data: NonNullable<Json>;
          group_id: string;
          id: string;
          revision: number;
          source_digest: string;
        };
        ComputedFields: never;
        Insert: {
          complete: boolean;
          created_at?: string;
          created_by: string;
          data: NonNullable<Json>;
          group_id: string;
          id?: string;
          revision: number;
          source_digest: string;
        };
        Update: {
          complete?: boolean;
          created_at?: string;
          created_by?: string;
          data?: NonNullable<Json>;
          group_id?: string;
          id?: string;
          revision?: number;
          source_digest?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_standing_snapshots_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_standing_snapshots_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "stage_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_tie_draws: {
        Row: {
          created_at: string;
          created_by: string;
          group_id: string;
          id: string;
          lots: NonNullable<Json>;
          members: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          group_id: string;
          id?: string;
          lots: NonNullable<Json>;
          members: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          group_id?: string;
          id?: string;
          lots?: NonNullable<Json>;
          members?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "group_tie_draws_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_tie_draws_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "stage_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      hall_commands: {
        Row: {
          actor_id: string;
          created_at: string;
          id: string;
          request: NonNullable<Json>;
          response: NonNullable<Json>;
          tour_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          id: string;
          request: NonNullable<Json>;
          response: NonNullable<Json>;
          tour_id: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          id?: string;
          request?: NonNullable<Json>;
          response?: NonNullable<Json>;
          tour_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hall_commands_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hall_commands_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      knockout_seed_maps: {
        Row: {
          seeds: NonNullable<Json>;
          size: number;
        };
        ComputedFields: never;
        Insert: {
          seeds: NonNullable<Json>;
          size: number;
        };
        Update: {
          seeds?: NonNullable<Json>;
          size?: number;
        };
        Relationships: [];
      };
      league_tables: {
        Row: {
          number: number;
        };
        ComputedFields: never;
        Insert: {
          number: number;
        };
        Update: {
          number?: number;
        };
        Relationships: [];
      };
      lineup_replacements: {
        Row: {
          changed_at: string;
          changed_by: string;
          id: string;
          lineup_id: string;
          match_id: string;
          new_player_id: string;
          new_player_name: string;
          old_player_id: string;
          old_player_name: string;
          reason: string;
          slot: number;
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          changed_by: string;
          id: string;
          lineup_id: string;
          match_id: string;
          new_player_id: string;
          new_player_name: string;
          old_player_id: string;
          old_player_name: string;
          reason: string;
          slot: number;
        };
        Update: {
          changed_at?: string;
          changed_by?: string;
          id?: string;
          lineup_id?: string;
          match_id?: string;
          new_player_id?: string;
          new_player_name?: string;
          old_player_id?: string;
          old_player_name?: string;
          reason?: string;
          slot?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lineup_replacements_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_replacements_lineup_id_fkey";
            columns: ["lineup_id"];
            isOneToOne: false;
            referencedRelation: "lineups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_replacements_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_replacements_new_player_id_fkey";
            columns: ["new_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_replacements_new_player_id_fkey";
            columns: ["new_player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_replacements_old_player_id_fkey";
            columns: ["old_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_replacements_old_player_id_fkey";
            columns: ["old_player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      lineup_slots: {
        Row: {
          gender: Database["public"]["Enums"]["player_gender"];
          lineup_id: string;
          player_id: string;
          player_name: string;
          slot: number;
        };
        ComputedFields: never;
        Insert: {
          gender: Database["public"]["Enums"]["player_gender"];
          lineup_id: string;
          player_id: string;
          player_name: string;
          slot: number;
        };
        Update: {
          gender?: Database["public"]["Enums"]["player_gender"];
          lineup_id?: string;
          player_id?: string;
          player_name?: string;
          slot?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lineup_slots_lineup_id_fkey";
            columns: ["lineup_id"];
            isOneToOne: false;
            referencedRelation: "lineups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_slots_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineup_slots_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      lineups: {
        Row: {
          id: string;
          match_id: string;
          original_players: string[];
          submitted_at: string;
          submitted_by: string;
          subteam_id: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          match_id: string;
          original_players: string[];
          submitted_at?: string;
          submitted_by: string;
          subteam_id: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          original_players?: string[];
          submitted_at?: string;
          submitted_by?: string;
          subteam_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lineups_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineups_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lineups_subteam_id_fkey";
            columns: ["subteam_id"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
        ];
      };
      live_players: {
        Row: {
          leased_at: string;
          match_id: string;
          player_id: string;
        };
        ComputedFields: never;
        Insert: {
          leased_at?: string;
          match_id: string;
          player_id: string;
        };
        Update: {
          leased_at?: string;
          match_id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_players_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      live_subteams: {
        Row: {
          leased_at: string;
          match_id: string;
          subteam_id: string;
        };
        ComputedFields: never;
        Insert: {
          leased_at?: string;
          match_id: string;
          subteam_id: string;
        };
        Update: {
          leased_at?: string;
          match_id?: string;
          subteam_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_subteams_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_subteams_subteam_id_fkey";
            columns: ["subteam_id"];
            isOneToOne: true;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_commands: {
        Row: {
          actor_id: string;
          after_state: NonNullable<Json>;
          before_state: NonNullable<Json>;
          created_at: string;
          id: string;
          kind: string;
          match_id: string;
          request: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          after_state: NonNullable<Json>;
          before_state: NonNullable<Json>;
          created_at?: string;
          id: string;
          kind: string;
          match_id: string;
          request: NonNullable<Json>;
        };
        Update: {
          actor_id?: string;
          after_state?: NonNullable<Json>;
          before_state?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          kind?: string;
          match_id?: string;
          request?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "match_commands_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_commands_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
        ];
      };
      match_sources: {
        Row: {
          match_id: string;
          outcome: string | null;
          side: string;
          source_entry_id: string | null;
          source_group_id: string | null;
          source_match_id: string | null;
          source_place: number | null;
          source_result_id: string | null;
          source_snapshot_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          match_id: string;
          outcome?: string | null;
          side: string;
          source_entry_id?: string | null;
          source_group_id?: string | null;
          source_match_id?: string | null;
          source_place?: number | null;
          source_result_id?: string | null;
          source_snapshot_id?: string | null;
        };
        Update: {
          match_id?: string;
          outcome?: string | null;
          side?: string;
          source_entry_id?: string | null;
          source_group_id?: string | null;
          source_match_id?: string | null;
          source_place?: number | null;
          source_result_id?: string | null;
          source_snapshot_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_sources_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_sources_source_entry_id_fkey";
            columns: ["source_entry_id"];
            isOneToOne: false;
            referencedRelation: "draw_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_sources_source_group_id_fkey";
            columns: ["source_group_id"];
            isOneToOne: false;
            referencedRelation: "stage_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_sources_source_match_id_fkey";
            columns: ["source_match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_sources_source_result_id_fkey";
            columns: ["source_result_id"];
            isOneToOne: false;
            referencedRelation: "team_match_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_sources_source_snapshot_id_fkey";
            columns: ["source_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "group_standing_snapshots";
            referencedColumns: ["id"];
          },
        ];
      };
      match_table_leases: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          match_id: string;
          table_number: number;
          venue_day: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          match_id: string;
          table_number: number;
          venue_day: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          match_id?: string;
          table_number?: number;
          venue_day?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_table_leases_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_table_leases_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_table_leases_table_number_fkey";
            columns: ["table_number"];
            isOneToOne: true;
            referencedRelation: "league_tables";
            referencedColumns: ["number"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          roles: Database["public"]["Enums"]["organization_role"][];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          roles: Database["public"]["Enums"]["organization_role"][];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          roles?: Database["public"]["Enums"]["organization_role"][];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      player_end_events: {
        Row: {
          created_at: string;
          created_by: string;
          ended_at: string;
          game_id: string;
          id: string;
          player_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          ended_at: string;
          game_id: string;
          id?: string;
          player_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_at?: string;
          game_id?: string;
          id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_end_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_end_events_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_end_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_end_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      player_photo_assets: {
        Row: {
          consent_version: string;
          created_at: string;
          declared_at: string;
          evidence_mime: string;
          evidence_path: string;
          evidence_sha256: string;
          evidence_size: number;
          id: string;
          photo_mime: string;
          photo_path: string;
          photo_sha256: string;
          photo_size: number;
          player_id: string;
          review_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          state: Database["public"]["Enums"]["photo_state"];
          updated_at: string;
          uploader_id: string;
        };
        ComputedFields: never;
        Insert: {
          consent_version?: string;
          created_at?: string;
          declared_at?: string;
          evidence_mime: string;
          evidence_path: string;
          evidence_sha256: string;
          evidence_size: number;
          id: string;
          photo_mime: string;
          photo_path: string;
          photo_sha256: string;
          photo_size: number;
          player_id: string;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          state?: Database["public"]["Enums"]["photo_state"];
          updated_at?: string;
          uploader_id: string;
        };
        Update: {
          consent_version?: string;
          created_at?: string;
          declared_at?: string;
          evidence_mime?: string;
          evidence_path?: string;
          evidence_sha256?: string;
          evidence_size?: number;
          id?: string;
          photo_mime?: string;
          photo_path?: string;
          photo_sha256?: string;
          photo_size?: number;
          player_id?: string;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          state?: Database["public"]["Enums"]["photo_state"];
          updated_at?: string;
          uploader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_photo_assets_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_photo_assets_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_photo_assets_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_photo_assets_uploader_id_fkey";
            columns: ["uploader_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      player_rest_heads: {
        Row: {
          last_ended_at: string;
          player_id: string;
        };
        ComputedFields: never;
        Insert: {
          last_ended_at: string;
          player_id: string;
        };
        Update: {
          last_ended_at?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_rest_heads_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_rest_heads_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      player_status_events: {
        Row: {
          created_at: string;
          effective_at: string;
          id: string;
          player_id: string;
          reason: string;
          set_by: string;
          status: Database["public"]["Enums"]["player_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          effective_at: string;
          id?: string;
          player_id: string;
          reason: string;
          set_by: string;
          status: Database["public"]["Enums"]["player_status"];
        };
        Update: {
          created_at?: string;
          effective_at?: string;
          id?: string;
          player_id?: string;
          reason?: string;
          set_by?: string;
          status?: Database["public"]["Enums"]["player_status"];
        };
        Relationships: [
          {
            foreignKeyName: "player_status_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_status_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_status_events_set_by_fkey";
            columns: ["set_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      player_trainer_refs: {
        Row: {
          created_at: string;
          free_first_name: string | null;
          free_last_name: string | null;
          kind: string;
          player_id: string;
          trainer_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          free_first_name?: string | null;
          free_last_name?: string | null;
          kind: string;
          player_id: string;
          trainer_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          free_first_name?: string | null;
          free_last_name?: string | null;
          kind?: string;
          player_id?: string;
          trainer_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_trainer_refs_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_trainer_refs_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_trainer_refs_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "trainer_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      players: {
        Row: {
          created_at: string;
          current_rating: number;
          date_of_birth: string;
          external_rating_id: string | null;
          first_name: string;
          gender: Database["public"]["Enums"]["player_gender"];
          id: string;
          last_name: string;
          playing_hand: string;
          playing_style: string;
          sports_level: string;
          status: Database["public"]["Enums"]["player_status"];
          team_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          current_rating?: number;
          date_of_birth: string;
          external_rating_id?: string | null;
          first_name: string;
          gender: Database["public"]["Enums"]["player_gender"];
          id: string;
          last_name: string;
          playing_hand: string;
          playing_style: string;
          sports_level: string;
          status?: Database["public"]["Enums"]["player_status"];
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_rating?: number;
          date_of_birth?: string;
          external_rating_id?: string | null;
          first_name?: string;
          gender?: Database["public"]["Enums"]["player_gender"];
          id?: string;
          last_name?: string;
          playing_hand?: string;
          playing_style?: string;
          sports_level?: string;
          status?: Database["public"]["Enums"]["player_status"];
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_match_snapshots: {
        Row: {
          data: NonNullable<Json>;
          match_id: string;
          tour_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          data: NonNullable<Json>;
          match_id: string;
          tour_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          data?: NonNullable<Json>;
          match_id?: string;
          tour_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "public_match_snapshots_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_match_snapshots_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      public_player_photos: {
        Row: {
          asset_id: string;
          content_base64: string;
          content_sha256: string;
          mime_type: string;
          player_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          asset_id: string;
          content_base64: string;
          content_sha256: string;
          mime_type?: string;
          player_id: string;
          updated_at?: string;
        };
        Update: {
          asset_id?: string;
          content_base64?: string;
          content_sha256?: string;
          mime_type?: string;
          player_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "public_player_photos_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: true;
            referencedRelation: "player_photo_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_player_photos_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_player_photos_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      rating_calculation_heads: {
        Row: {
          calculation_id: string;
          game_id: string;
        };
        ComputedFields: never;
        Insert: {
          calculation_id: string;
          game_id: string;
        };
        Update: {
          calculation_id?: string;
          game_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rating_calculation_heads_calculation_id_fkey";
            columns: ["calculation_id"];
            isOneToOne: false;
            referencedRelation: "rating_calculations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculation_heads_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
        ];
      };
      rating_calculations: {
        Row: {
          a_after: number;
          a_before: number;
          b_after: number;
          b_before: number;
          completion_order: number;
          created_at: string;
          created_by: string;
          game_id: string;
          id: string;
          k_factor: number;
          player_a: string;
          player_b: string;
          previous_calculation_id: string | null;
          result_id: string;
          revision: number;
          settings_id: string;
        };
        ComputedFields: never;
        Insert: {
          a_after: number;
          a_before: number;
          b_after: number;
          b_before: number;
          completion_order: number;
          created_at?: string;
          created_by: string;
          game_id: string;
          id?: string;
          k_factor: number;
          player_a: string;
          player_b: string;
          previous_calculation_id?: string | null;
          result_id: string;
          revision: number;
          settings_id: string;
        };
        Update: {
          a_after?: number;
          a_before?: number;
          b_after?: number;
          b_before?: number;
          completion_order?: number;
          created_at?: string;
          created_by?: string;
          game_id?: string;
          id?: string;
          k_factor?: number;
          player_a?: string;
          player_b?: string;
          previous_calculation_id?: string | null;
          result_id?: string;
          revision?: number;
          settings_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rating_calculations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_player_a_fkey";
            columns: ["player_a"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_player_a_fkey";
            columns: ["player_a"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_player_b_fkey";
            columns: ["player_b"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_player_b_fkey";
            columns: ["player_b"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_previous_calculation_id_fkey";
            columns: ["previous_calculation_id"];
            isOneToOne: false;
            referencedRelation: "rating_calculations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "singles_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_calculations_settings_id_fkey";
            columns: ["settings_id"];
            isOneToOne: false;
            referencedRelation: "tournament_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      rating_history: {
        Row: {
          calculation_id: string | null;
          created_at: string;
          external_rating_id: string | null;
          game_result_id: string | null;
          id: string;
          import_id: string | null;
          player_id: string;
          rating_after: number;
          rating_before: number | null;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          calculation_id?: string | null;
          created_at?: string;
          external_rating_id?: string | null;
          game_result_id?: string | null;
          id?: string;
          import_id?: string | null;
          player_id: string;
          rating_after: number;
          rating_before?: number | null;
          source: string;
        };
        Update: {
          calculation_id?: string | null;
          created_at?: string;
          external_rating_id?: string | null;
          game_result_id?: string | null;
          id?: string;
          import_id?: string | null;
          player_id?: string;
          rating_after?: number;
          rating_before?: number | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rating_history_calculation_id_fkey";
            columns: ["calculation_id"];
            isOneToOne: false;
            referencedRelation: "rating_calculations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_history_game_result_id_fkey";
            columns: ["game_result_id"];
            isOneToOne: false;
            referencedRelation: "singles_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_history_import_id_fkey";
            columns: ["import_id"];
            isOneToOne: false;
            referencedRelation: "rating_imports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_history_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_history_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      rating_imports: {
        Row: {
          created_at: string;
          created_by: string;
          external_revision: string;
          id: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          external_revision: string;
          id?: string;
          source: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          external_revision?: string;
          id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rating_imports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      rating_replay_anchors: {
        Row: {
          created_at: string;
          history_id: string;
          player_id: string;
          rating: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          history_id: string;
          player_id: string;
          rating: number;
        };
        Update: {
          created_at?: string;
          history_id?: string;
          player_id?: string;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rating_replay_anchors_history_id_fkey";
            columns: ["history_id"];
            isOneToOne: false;
            referencedRelation: "rating_history";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_replay_anchors_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_replay_anchors_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
        ];
      };
      result_correction_events: {
        Row: {
          actor_id: string;
          actor_role: Database["public"]["Enums"]["staff_role"];
          after_state: NonNullable<Json>;
          before_state: Json | null;
          created_at: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          request_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          actor_role: Database["public"]["Enums"]["staff_role"];
          after_state: NonNullable<Json>;
          before_state?: Json | null;
          created_at?: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          request_id: string;
        };
        Update: {
          actor_id?: string;
          actor_role?: Database["public"]["Enums"]["staff_role"];
          after_state?: NonNullable<Json>;
          before_state?: Json | null;
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_correction_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_correction_events_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "result_correction_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      result_correction_requests: {
        Row: {
          base_result_id: string;
          created_at: string;
          game_id: string;
          id: string;
          payload: NonNullable<Json>;
          proposed_kind: string;
          proposed_state: NonNullable<Json>;
          proposed_winner: string;
          reason: string;
          submitted_by: string;
        };
        ComputedFields: never;
        Insert: {
          base_result_id: string;
          created_at?: string;
          game_id: string;
          id: string;
          payload: NonNullable<Json>;
          proposed_kind: string;
          proposed_state: NonNullable<Json>;
          proposed_winner: string;
          reason: string;
          submitted_by: string;
        };
        Update: {
          base_result_id?: string;
          created_at?: string;
          game_id?: string;
          id?: string;
          payload?: NonNullable<Json>;
          proposed_kind?: string;
          proposed_state?: NonNullable<Json>;
          proposed_winner?: string;
          reason?: string;
          submitted_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_correction_requests_base_result_id_fkey";
            columns: ["base_result_id"];
            isOneToOne: false;
            referencedRelation: "singles_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_correction_requests_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_correction_requests_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      result_correction_states: {
        Row: {
          request_id: string;
          status: string;
          updated_at: string;
          updated_by: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          request_id: string;
          status?: string;
          updated_at?: string;
          updated_by: string;
          version?: number;
        };
        Update: {
          request_id?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "result_correction_states_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "result_correction_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_correction_states_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      roster_memberships: {
        Row: {
          created_at: string;
          ended_at: string | null;
          ended_reason: string | null;
          id: string;
          joined_at: string;
          player_id: string;
          season_id: string;
          subteam_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          ended_reason?: string | null;
          id?: string;
          joined_at?: string;
          player_id: string;
          season_id: string;
          subteam_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          ended_reason?: string | null;
          id?: string;
          joined_at?: string;
          player_id?: string;
          season_id?: string;
          subteam_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roster_memberships_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roster_memberships_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roster_memberships_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roster_memberships_subteam_id_fkey";
            columns: ["subteam_id"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
        ];
      };
      score_events: {
        Row: {
          actor_id: string;
          actor_role: Database["public"]["Enums"]["staff_role"];
          after_state: NonNullable<Json>;
          assignment_id: string | null;
          authority: string;
          before_state: NonNullable<Json>;
          created_at: string;
          game_id: string;
          id: string;
          kind: string;
          request: NonNullable<Json>;
          table_number: number | null;
          undo_set_number: number | null;
          undo_target_id: string | null;
          venue_day: string | null;
          version_after: number;
          version_before: number;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          actor_role: Database["public"]["Enums"]["staff_role"];
          after_state: NonNullable<Json>;
          assignment_id?: string | null;
          authority: string;
          before_state: NonNullable<Json>;
          created_at?: string;
          game_id: string;
          id: string;
          kind: string;
          request: NonNullable<Json>;
          table_number?: number | null;
          undo_set_number?: number | null;
          undo_target_id?: string | null;
          venue_day?: string | null;
          version_after: number;
          version_before: number;
        };
        Update: {
          actor_id?: string;
          actor_role?: Database["public"]["Enums"]["staff_role"];
          after_state?: NonNullable<Json>;
          assignment_id?: string | null;
          authority?: string;
          before_state?: NonNullable<Json>;
          created_at?: string;
          game_id?: string;
          id?: string;
          kind?: string;
          request?: NonNullable<Json>;
          table_number?: number | null;
          undo_set_number?: number | null;
          undo_target_id?: string | null;
          venue_day?: string | null;
          version_after?: number;
          version_before?: number;
        };
        Relationships: [
          {
            foreignKeyName: "score_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_events_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "table_judge_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_events_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_events_table_number_fkey";
            columns: ["table_number"];
            isOneToOne: false;
            referencedRelation: "league_tables";
            referencedColumns: ["number"];
          },
          {
            foreignKeyName: "score_events_undo_target_id_fkey";
            columns: ["undo_target_id"];
            isOneToOne: false;
            referencedRelation: "score_events";
            referencedColumns: ["id"];
          },
        ];
      };
      season_configuration_snapshots: {
        Row: {
          configuration: NonNullable<Json>;
          created_at: string;
          created_by: string;
          season_id: string;
        };
        ComputedFields: never;
        Insert: {
          configuration: NonNullable<Json>;
          created_at?: string;
          created_by: string;
          season_id: string;
        };
        Update: {
          configuration?: NonNullable<Json>;
          created_at?: string;
          created_by?: string;
          season_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "season_configuration_snapshots_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "season_configuration_snapshots_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: true;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      season_team_entries: {
        Row: {
          created_at: string;
          season_id: string;
          team_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          season_id: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          season_id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "season_team_entries_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "season_team_entries_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "season_team_entries_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name: string;
          started_at: string | null;
          starts_on: string;
          status: Database["public"]["Enums"]["season_status"];
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_on: string;
          id: string;
          name: string;
          started_at?: string | null;
          starts_on: string;
          status?: Database["public"]["Enums"]["season_status"];
          updated_at?: string;
          year: number;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          name?: string;
          started_at?: string | null;
          starts_on?: string;
          status?: Database["public"]["Enums"]["season_status"];
          updated_at?: string;
          year?: number;
        };
        Relationships: [];
      };
      singles_games: {
        Row: {
          completion_order: number | null;
          ended_at: string | null;
          id: string;
          match_id: string;
          player_a: string;
          player_a_name: string | null;
          player_b: string;
          player_b_name: string | null;
          result_id: string | null;
          result_revision: number;
          score_state: Json | null;
          score_version: number;
          slot: number;
          started_at: string | null;
          status: Database["public"]["Enums"]["singles_game_status"];
          timeout_side: string | null;
          timeout_until: string | null;
        };
        ComputedFields: never;
        Insert: {
          completion_order?: number | null;
          ended_at?: string | null;
          id?: string;
          match_id: string;
          player_a: string;
          player_a_name?: string | null;
          player_b: string;
          player_b_name?: string | null;
          result_id?: string | null;
          result_revision?: number;
          score_state?: Json | null;
          score_version?: number;
          slot: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["singles_game_status"];
          timeout_side?: string | null;
          timeout_until?: string | null;
        };
        Update: {
          completion_order?: number | null;
          ended_at?: string | null;
          id?: string;
          match_id?: string;
          player_a?: string;
          player_a_name?: string | null;
          player_b?: string;
          player_b_name?: string | null;
          result_id?: string | null;
          result_revision?: number;
          score_state?: Json | null;
          score_version?: number;
          slot?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["singles_game_status"];
          timeout_side?: string | null;
          timeout_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "singles_games_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_games_player_a_fkey";
            columns: ["player_a"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_games_player_a_fkey";
            columns: ["player_a"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_games_player_b_fkey";
            columns: ["player_b"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_games_player_b_fkey";
            columns: ["player_b"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_games_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "singles_results";
            referencedColumns: ["id"];
          },
        ];
      };
      singles_results: {
        Row: {
          actual_sets: NonNullable<Json>;
          completion_order: number;
          created_at: string;
          created_by: string;
          ended_at: string;
          game_id: string;
          id: string;
          k_factor: number;
          kind: string;
          player_a: string;
          player_a_name: string;
          player_b: string;
          player_b_name: string;
          points_a: number;
          points_b: number;
          previous_result_id: string | null;
          revision: number;
          sets_a: number;
          sets_b: number;
          settings_id: string;
          winner: string;
        };
        ComputedFields: never;
        Insert: {
          actual_sets: NonNullable<Json>;
          completion_order: number;
          created_at?: string;
          created_by: string;
          ended_at: string;
          game_id: string;
          id?: string;
          k_factor: number;
          kind: string;
          player_a: string;
          player_a_name: string;
          player_b: string;
          player_b_name: string;
          points_a: number;
          points_b: number;
          previous_result_id?: string | null;
          revision: number;
          sets_a: number;
          sets_b: number;
          settings_id: string;
          winner: string;
        };
        Update: {
          actual_sets?: NonNullable<Json>;
          completion_order?: number;
          created_at?: string;
          created_by?: string;
          ended_at?: string;
          game_id?: string;
          id?: string;
          k_factor?: number;
          kind?: string;
          player_a?: string;
          player_a_name?: string;
          player_b?: string;
          player_b_name?: string;
          points_a?: number;
          points_b?: number;
          previous_result_id?: string | null;
          revision?: number;
          sets_a?: number;
          sets_b?: number;
          settings_id?: string;
          winner?: string;
        };
        Relationships: [
          {
            foreignKeyName: "singles_results_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_results_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "singles_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_results_player_a_fkey";
            columns: ["player_a"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_results_player_a_fkey";
            columns: ["player_a"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_results_player_b_fkey";
            columns: ["player_b"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_results_player_b_fkey";
            columns: ["player_b"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_results_previous_result_id_fkey";
            columns: ["previous_result_id"];
            isOneToOne: false;
            referencedRelation: "singles_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "singles_results_settings_id_fkey";
            columns: ["settings_id"];
            isOneToOne: false;
            referencedRelation: "tournament_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_accounts: {
        Row: {
          active: boolean;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_accounts_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_jobs: {
        Row: {
          actor_id: string;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          operation: string;
          roles: Database["public"]["Enums"]["staff_role"][];
          status: string;
          target_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
          operation: string;
          roles: Database["public"]["Enums"]["staff_role"][];
          status?: string;
          target_id: string;
          updated_at?: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          operation?: string;
          roles?: Database["public"]["Enums"]["staff_role"][];
          status?: string;
          target_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_jobs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_roles: {
        Row: {
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      stage_groups: {
        Row: {
          draw_id: string;
          id: string;
          label: string;
          ordinal: number;
          stage_id: string;
        };
        ComputedFields: never;
        Insert: {
          draw_id: string;
          id?: string;
          label: string;
          ordinal: number;
          stage_id: string;
        };
        Update: {
          draw_id?: string;
          id?: string;
          label?: string;
          ordinal?: number;
          stage_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stage_groups_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draw_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stage_groups_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["id"];
          },
        ];
      };
      stage_templates: {
        Row: {
          created_at: string;
          created_by: string;
          definition: NonNullable<Json>;
          entry_count: number;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          definition: NonNullable<Json>;
          entry_count: number;
          id: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          definition?: NonNullable<Json>;
          entry_count?: number;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stage_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      stages: {
        Row: {
          configuration: NonNullable<Json>;
          id: string;
          kind: string;
          ordinal: number;
          plan_id: string;
        };
        ComputedFields: never;
        Insert: {
          configuration: NonNullable<Json>;
          id?: string;
          kind: string;
          ordinal: number;
          plan_id: string;
        };
        Update: {
          configuration?: NonNullable<Json>;
          id?: string;
          kind?: string;
          ordinal?: number;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stages_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "tour_stage_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      subteam_trainers: {
        Row: {
          created_at: string;
          subteam_id: string;
          trainer_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          subteam_id: string;
          trainer_id: string;
        };
        Update: {
          created_at?: string;
          subteam_id?: string;
          trainer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subteam_trainers_subteam_id_fkey";
            columns: ["subteam_id"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subteam_trainers_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "trainer_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      subteams: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"];
          created_at: string;
          id: string;
          team_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"];
          created_at?: string;
          id?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"];
          created_at?: string;
          id?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subteams_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "subteams_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      table_day_heads: {
        Row: {
          assignment_id: string;
          staff_id: string | null;
          table_number: number;
          venue_day: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          assignment_id: string;
          staff_id?: string | null;
          table_number: number;
          venue_day: string;
          version: number;
        };
        Update: {
          assignment_id?: string;
          staff_id?: string | null;
          table_number?: number;
          venue_day?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "table_day_heads_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "table_judge_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_day_heads_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_day_heads_table_number_fkey";
            columns: ["table_number"];
            isOneToOne: false;
            referencedRelation: "league_tables";
            referencedColumns: ["number"];
          },
        ];
      };
      table_judge_assignments: {
        Row: {
          context_tour_id: string;
          created_at: string;
          created_by: string;
          id: string;
          mode: string;
          reason: string;
          revision: number;
          staff_id: string | null;
          table_number: number;
          venue_day: string;
        };
        ComputedFields: never;
        Insert: {
          context_tour_id: string;
          created_at?: string;
          created_by: string;
          id: string;
          mode: string;
          reason: string;
          revision: number;
          staff_id?: string | null;
          table_number: number;
          venue_day: string;
        };
        Update: {
          context_tour_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          mode?: string;
          reason?: string;
          revision?: number;
          staff_id?: string | null;
          table_number?: number;
          venue_day?: string;
        };
        Relationships: [
          {
            foreignKeyName: "table_judge_assignments_context_tour_id_fkey";
            columns: ["context_tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_judge_assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_judge_assignments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_judge_assignments_table_number_fkey";
            columns: ["table_number"];
            isOneToOne: false;
            referencedRelation: "league_tables";
            referencedColumns: ["number"];
          },
        ];
      };
      team_match_results: {
        Row: {
          created_at: string;
          created_by: string;
          games_a: number;
          games_b: number;
          id: string;
          kind: string;
          match_id: string;
          points_a: number;
          points_b: number;
          previous_result_id: string | null;
          revision: number;
          sets_a: number;
          sets_b: number;
          winner: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          games_a: number;
          games_b: number;
          id?: string;
          kind: string;
          match_id: string;
          points_a: number;
          points_b: number;
          previous_result_id?: string | null;
          revision: number;
          sets_a: number;
          sets_b: number;
          winner: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          games_a?: number;
          games_b?: number;
          id?: string;
          kind?: string;
          match_id?: string;
          points_a?: number;
          points_b?: number;
          previous_result_id?: string | null;
          revision?: number;
          sets_a?: number;
          sets_b?: number;
          winner?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_match_results_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_match_results_previous_result_id_fkey";
            columns: ["previous_result_id"];
            isOneToOne: false;
            referencedRelation: "team_match_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_match_results_winner_fkey";
            columns: ["winner"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_matches: {
        Row: {
          completed_at: string | null;
          draw_id: string;
          group_id: string;
          id: string;
          lineup_version: number;
          lineups_reveal_version: number | null;
          lineups_revealed_at: string | null;
          match_no: number;
          placement_from: number | null;
          placement_to: number | null;
          result_id: string | null;
          result_revision: number;
          round_no: number;
          stage_id: string;
          start_blocked: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["team_match_status"];
          subteam_a: string | null;
          subteam_b: string | null;
          superseded_by: string | null;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          draw_id: string;
          group_id: string;
          id?: string;
          lineup_version?: number;
          lineups_reveal_version?: number | null;
          lineups_revealed_at?: string | null;
          match_no: number;
          placement_from?: number | null;
          placement_to?: number | null;
          result_id?: string | null;
          result_revision?: number;
          round_no: number;
          stage_id: string;
          start_blocked?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["team_match_status"];
          subteam_a?: string | null;
          subteam_b?: string | null;
          superseded_by?: string | null;
          version?: number;
        };
        Update: {
          completed_at?: string | null;
          draw_id?: string;
          group_id?: string;
          id?: string;
          lineup_version?: number;
          lineups_reveal_version?: number | null;
          lineups_revealed_at?: string | null;
          match_no?: number;
          placement_from?: number | null;
          placement_to?: number | null;
          result_id?: string | null;
          result_revision?: number;
          round_no?: number;
          stage_id?: string;
          start_blocked?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["team_match_status"];
          subteam_a?: string | null;
          subteam_b?: string | null;
          superseded_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_matches_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draw_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_matches_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "stage_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_matches_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "team_match_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_matches_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_matches_subteam_a_fkey";
            columns: ["subteam_a"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_matches_subteam_b_fkey";
            columns: ["subteam_b"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_matches_superseded_by_fkey";
            columns: ["superseded_by"];
            isOneToOne: false;
            referencedRelation: "team_matches";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          region: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          name: string;
          region: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          region?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tour_placements: {
        Row: {
          draw_id: string;
          place: number;
          source_result_id: string;
          source_snapshot_id: string | null;
          subteam_id: string;
        };
        ComputedFields: never;
        Insert: {
          draw_id: string;
          place: number;
          source_result_id: string;
          source_snapshot_id?: string | null;
          subteam_id: string;
        };
        Update: {
          draw_id?: string;
          place?: number;
          source_result_id?: string;
          source_snapshot_id?: string | null;
          subteam_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tour_placements_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draw_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_placements_source_result_id_fkey";
            columns: ["source_result_id"];
            isOneToOne: false;
            referencedRelation: "team_match_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_placements_source_snapshot_id_fkey";
            columns: ["source_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "group_standing_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_placements_subteam_id_fkey";
            columns: ["subteam_id"];
            isOneToOne: false;
            referencedRelation: "subteams";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_stage_plans: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"];
          created_at: string;
          created_by: string;
          id: string;
          revision: number;
          template_id: string;
          tour_id: string;
        };
        ComputedFields: never;
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"];
          created_at?: string;
          created_by: string;
          id: string;
          revision: number;
          template_id: string;
          tour_id: string;
        };
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"];
          created_at?: string;
          created_by?: string;
          id?: string;
          revision?: number;
          template_id?: string;
          tour_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tour_stage_plans_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_stage_plans_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "stage_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_stage_plans_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_settings: {
        Row: {
          created_by: string;
          effective_at: string;
          finals_priority: boolean;
          id: string;
          k_factor: number;
          rest_minutes: number;
          revision: number;
          table_count: number;
          tour_id: string;
          venue_timezone: string;
        };
        ComputedFields: never;
        Insert: {
          created_by: string;
          effective_at?: string;
          finals_priority: boolean;
          id: string;
          k_factor: number;
          rest_minutes: number;
          revision: number;
          table_count: number;
          tour_id: string;
          venue_timezone: string;
        };
        Update: {
          created_by?: string;
          effective_at?: string;
          finals_priority?: boolean;
          id?: string;
          k_factor?: number;
          rest_minutes?: number;
          revision?: number;
          table_count?: number;
          tour_id?: string;
          venue_timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_settings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_settings_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      tours: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name: string;
          ordinal: number;
          placement_weight: number;
          season_id: string;
          starts_on: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_on: string;
          id: string;
          name: string;
          ordinal: number;
          placement_weight?: number;
          season_id: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          name?: string;
          ordinal?: number;
          placement_weight?: number;
          season_id?: string;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tours_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      trainer_profiles: {
        Row: {
          created_at: string;
          team_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          team_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          team_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "public_league_players";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "trainer_profiles_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trainer_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "staff_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_league_players: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"] | null;
          first_name: string | null;
          has_photo: boolean | null;
          id: string | null;
          last_name: string | null;
          rating: number | null;
          team_id: string | null;
          team_name: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      add_roster_player: {
        Args: { parent_season: string; player: string; target_subteam: string };
        Returns: string;
      };
      age_group_for_birth_year: {
        Args: { birth_year: number; season_year: number };
        Returns: string;
      };
      apply_result_correction: {
        Args: {
          command_id: string;
          expected_digest: string;
          reason: string;
          request_id: string;
          resolve_started: boolean;
        };
        Returns: Json;
      };
      assign_table_judge: {
        Args: {
          assignment_id: string;
          expected_version: number;
          reason: string;
          staff: string;
          table_no: number;
          tournament: string;
          venue_day: string;
        };
        Returns: string;
      };
      assign_team_trainer: {
        Args: { club: string; coached_subteams: string[]; trainer: string };
        Returns: undefined;
      };
      available_team_trainers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          display_name: string;
          id: string;
          team_id: string;
        }[];
      };
      begin_player_photo: {
        Args: {
          asset: string;
          evidence_hash: string;
          evidence_mime: string;
          evidence_size: number;
          permission_confirmed: boolean;
          photo_hash: string;
          photo_mime: string;
          photo_size: number;
          player: string;
        };
        Returns: {
          consent_version: string;
          created_at: string;
          declared_at: string;
          evidence_mime: string;
          evidence_path: string;
          evidence_sha256: string;
          evidence_size: number;
          id: string;
          photo_mime: string;
          photo_path: string;
          photo_sha256: string;
          photo_size: number;
          player_id: string;
          review_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          state: Database["public"]["Enums"]["photo_state"];
          updated_at: string;
          uploader_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "player_photo_assets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      begin_staff_job: {
        Args: {
          desired_roles: Database["public"]["Enums"]["staff_role"][];
          job_id: string;
          job_operation: string;
          staff_email: string;
          staff_name: string;
          target: string;
        };
        Returns: {
          actor_id: string;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          operation: string;
          roles: Database["public"]["Enums"]["staff_role"][];
          status: string;
          target_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "staff_jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      bootstrap_organizer: { Args: { target: string }; Returns: undefined };
      change_staff: {
        Args: {
          desired_roles: Database["public"]["Enums"]["staff_role"][];
          is_active: boolean;
          target: string;
        };
        Returns: string;
      };
      claim_score_http_request: {
        Args: { operation: string };
        Returns: boolean;
      };
      configure_tour_stages: {
        Args: {
          age_groups: Database["public"]["Enums"]["age_group"][];
          template: string;
          tournament: string;
        };
        Returns: undefined;
      };
      configure_tour_weight: {
        Args: { tournament: string; weight: number };
        Returns: undefined;
      };
      create_organization: {
        Args: { organization_name: string; organization_slug: string };
        Returns: string;
      };
      create_stage_template: {
        Args: { definition: Json; template_id: string; template_name: string };
        Returns: string;
      };
      draw_group_ties: {
        Args: { expected_revision: number; group_id: string };
        Returns: string;
      };
      drop_player: {
        Args: { effective_date: string; player: string; reason: string };
        Returns: undefined;
      };
      end_roster_membership: {
        Args: { membership: string; reason: string };
        Returns: undefined;
      };
      finish_player_photo: { Args: { asset: string }; Returns: undefined };
      finish_staff_job: {
        Args: { job_id: string; succeeded: boolean };
        Returns: string;
      };
      generate_tour_draw: {
        Args: {
          age: Database["public"]["Enums"]["age_group"];
          draw_id: string;
          expected_revision: number;
          tournament: string;
        };
        Returns: string;
      };
      get_game_score: { Args: { game: string }; Returns: Json };
      get_hall_snapshot: { Args: { tournament: string }; Returns: Json };
      get_judge_desk: { Args: Record<PropertyKey, never>; Returns: Json };
      get_lineup_status: { Args: { match: string }; Returns: Json };
      get_match_operation: { Args: { match: string }; Returns: Json };
      get_public_directory: { Args: Record<PropertyKey, never>; Returns: Json };
      get_public_health: { Args: Record<PropertyKey, never>; Returns: string };
      get_public_player_history: { Args: { player: string }; Returns: Json };
      get_public_season_standings: { Args: { season: string }; Returns: Json };
      get_result_correction: { Args: { request_id: string }; Returns: Json };
      is_player_photo_approved: { Args: { asset: string }; Returns: boolean };
      lineup_match_names: {
        Args: { matches: string[] };
        Returns: {
          club_id: string;
          match_id: string;
          name: string;
          side: string;
          subteam_id: string;
        }[];
      };
      manage_match: {
        Args: {
          command_id: string;
          expected_version: number;
          match: string;
          operation: string;
          reason: string;
          table_no: number;
        };
        Returns: Json;
      };
      publish_tour_draw: {
        Args: { draw: string; expected_revision: number };
        Returns: undefined;
      };
      refresh_group_standings: { Args: { group_id: string }; Returns: string };
      register_season_team: {
        Args: { club: string; parent_season: string };
        Returns: undefined;
      };
      replace_lineup_player: {
        Args: {
          expected_lineup_version: number;
          match: string;
          player: string;
          reason: string;
          replacement_id: string;
          slot: number;
          subteam: string;
        };
        Returns: Json;
      };
      resume_corrected_match: {
        Args: {
          command_id: string;
          expected_version: number;
          match: string;
          reason: string;
        };
        Returns: Json;
      };
      review_player_photo: {
        Args: {
          asset: string;
          decision: string;
          publication?: Json;
          reason: string;
        };
        Returns: undefined;
      };
      run_hall_command: {
        Args: {
          command_id: string;
          operation: string;
          reason: string;
          tournament: string;
        };
        Returns: Json;
      };
      save_player: {
        Args: {
          club: string;
          dob: string;
          external_id?: string;
          first_name: string;
          gender: Database["public"]["Enums"]["player_gender"];
          hand: string;
          last_name: string;
          player_id: string;
          sports_level: string;
          style: string;
        };
        Returns: string;
      };
      save_season: {
        Args: {
          first_day: string;
          last_day: string;
          season_id: string;
          season_name: string;
          season_year: number;
        };
        Returns: string;
      };
      save_team: {
        Args: { team_id: string; team_name: string; team_region: string };
        Returns: string;
      };
      save_tour: {
        Args: {
          first_day: string;
          last_day: string;
          parent_season: string;
          tour_id: string;
          tour_name: string;
          tour_ordinal: number;
        };
        Returns: string;
      };
      save_tournament_settings: {
        Args: {
          expected_revision: number;
          k: number;
          prioritize_finals: boolean;
          rest: number;
          settings_id: string;
          tables: number;
          timezone_name: string;
          tournament: string;
        };
        Returns: string;
      };
      score_command: {
        Args: {
          command_id: string;
          expected_version: number;
          game: string;
          kind: string;
          note?: string;
          side: string;
        };
        Returns: Json;
      };
      season_configuration_readiness: {
        Args: { parent_season: string };
        Returns: Json;
      };
      set_player_trainer: {
        Args: {
          first_name: string;
          last_name: string;
          player: string;
          ref_kind: string;
          trainer: string;
        };
        Returns: undefined;
      };
      set_player_trainer_reference: {
        Args: { player: string; ref_kind: string; reference: Json };
        Returns: undefined;
      };
      start_season: { Args: { season_id: string }; Returns: undefined };
      submit_lineup: {
        Args: {
          lineup_id: string;
          match: string;
          players: string[];
          subteam: string;
        };
        Returns: Json;
      };
      submit_result_correction: {
        Args: {
          base_result: string;
          game: string;
          kind: string;
          reason: string;
          request_id: string;
          score: Json;
          winner: string;
        };
        Returns: Json;
      };
      swap_draw_seeds: {
        Args: {
          draw_id: string;
          expected_revision: number;
          reason: string;
          seed_a: number;
          seed_b: number;
          source_draw: string;
        };
        Returns: string;
      };
      takeover_table: {
        Args: {
          assignment_id: string;
          expected_version: number;
          reason: string;
          table_no: number;
          tournament: string;
          venue_day: string;
        };
        Returns: string;
      };
      transfer_player: {
        Args: { new_club: string; player: string; reason: string };
        Returns: undefined;
      };
      update_staff_name: { Args: { new_name: string }; Returns: undefined };
    };
    Enums: {
      age_group: "U13" | "U15" | "U17";
      organization_role:
        "owner" | "tournament_director" | "scorekeeper" | "player";
      photo_state:
        | "pending_upload"
        | "pending_review"
        | "approved"
        | "rejected"
        | "revoked";
      player_gender: "boy" | "girl";
      player_status: "active" | "dropped_out";
      season_status: "draft" | "started";
      singles_game_status: "pending" | "in_progress" | "finished" | "cancelled";
      staff_role: "organizer" | "main_judge" | "trainer" | "line_judge";
      team_match_status:
        "scheduled" | "called" | "in_progress" | "finished" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      age_group: ["U13", "U15", "U17"],
      organization_role: [
        "owner",
        "tournament_director",
        "scorekeeper",
        "player",
      ],
      photo_state: [
        "pending_upload",
        "pending_review",
        "approved",
        "rejected",
        "revoked",
      ],
      player_gender: ["boy", "girl"],
      player_status: ["active", "dropped_out"],
      season_status: ["draft", "started"],
      singles_game_status: ["pending", "in_progress", "finished", "cancelled"],
      staff_role: ["organizer", "main_judge", "trainer", "line_judge"],
      team_match_status: [
        "scheduled",
        "called",
        "in_progress",
        "finished",
        "cancelled",
      ],
    },
  },
} as const;
