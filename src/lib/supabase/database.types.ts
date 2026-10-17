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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      age_group_for_birth_year: {
        Args: { birth_year: number; season_year: number };
        Returns: string;
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
      finish_staff_job: {
        Args: { job_id: string; succeeded: boolean };
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
      start_season: { Args: { season_id: string }; Returns: undefined };
      update_staff_name: { Args: { new_name: string }; Returns: undefined };
    };
    Enums: {
      organization_role:
        "owner" | "tournament_director" | "scorekeeper" | "player";
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
      organization_role: [
        "owner",
        "tournament_director",
        "scorekeeper",
        "player",
      ],
      season_status: ["draft", "started"],
      staff_role: ["organizer", "main_judge", "trainer", "line_judge"],
    },
  },
} as const;
