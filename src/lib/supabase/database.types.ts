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
      rating_history: {
        Row: {
          created_at: string;
          external_rating_id: string | null;
          id: string;
          import_id: string | null;
          player_id: string;
          rating_after: number;
          rating_before: number | null;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          external_rating_id?: string | null;
          id?: string;
          import_id?: string | null;
          player_id: string;
          rating_after: number;
          rating_before?: number | null;
          source: string;
        };
        Update: {
          created_at?: string;
          external_rating_id?: string | null;
          id?: string;
          import_id?: string | null;
          player_id?: string;
          rating_after?: number;
          rating_before?: number | null;
          source?: string;
        };
        Relationships: [
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
            referencedRelation: "teams";
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
      tours: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name: string;
          ordinal: number;
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
      [_ in never]: never;
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
      create_organization: {
        Args: { organization_name: string; organization_slug: string };
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
      finish_staff_job: {
        Args: { job_id: string; succeeded: boolean };
        Returns: string;
      };
      register_season_team: {
        Args: { club: string; parent_season: string };
        Returns: undefined;
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
      player_gender: "boy" | "girl";
      player_status: "active" | "dropped_out";
      season_status: "draft" | "started";
      staff_role: "organizer" | "main_judge" | "trainer" | "line_judge";
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
      player_gender: ["boy", "girl"],
      player_status: ["active", "dropped_out"],
      season_status: ["draft", "started"],
      staff_role: ["organizer", "main_judge", "trainer", "line_judge"],
    },
  },
} as const;
