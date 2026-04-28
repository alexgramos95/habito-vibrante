export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          app_locale: string | null
          app_platform: string | null
          created_at: string
          event_name: string
          event_props: Json
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          app_locale?: string | null
          app_platform?: string | null
          created_at?: string
          event_name: string
          event_props?: Json
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_locale?: string | null
          app_platform?: string | null
          created_at?: string
          event_name?: string
          event_props?: Json
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          additional_notes: string | null
          created_at: string
          feedback_type: string
          how_become_helped: string | null
          id: string
          submitted_at: string
          user_id: string
          what_prevents_pay: string | null
          what_would_make_pay: string | null
          willingness_to_pay: string | null
        }
        Insert: {
          additional_notes?: string | null
          created_at?: string
          feedback_type?: string
          how_become_helped?: string | null
          id?: string
          submitted_at?: string
          user_id: string
          what_prevents_pay?: string | null
          what_would_make_pay?: string | null
          willingness_to_pay?: string | null
        }
        Update: {
          additional_notes?: string | null
          created_at?: string
          feedback_type?: string
          how_become_helped?: string | null
          id?: string
          submitted_at?: string
          user_id?: string
          what_prevents_pay?: string | null
          what_would_make_pay?: string | null
          willingness_to_pay?: string | null
        }
        Relationships: []
      }
      pro_interest: {
        Row: {
          created_at: string
          id: string
          plan_interested: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_interested: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_interested?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string | null
          display_name: string | null
          id: string
          language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          timezone: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      revenue_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          occurred_at: string
          plan: string | null
          raw: Json
          status: string | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          plan?: string | null
          raw?: Json
          status?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          plan?: string | null
          raw?: Json
          status?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          apple_transaction_id: string | null
          created_at: string
          current_period_end: string | null
          google_purchase_token: string | null
          id: string
          plan: string
          purchase_date: string | null
          purchase_plan: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_transaction_id?: string | null
          created_at?: string
          current_period_end?: string | null
          google_purchase_token?: string | null
          id?: string
          plan?: string
          purchase_date?: string | null
          purchase_plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_transaction_id?: string | null
          created_at?: string
          current_period_end?: string | null
          google_purchase_token?: string | null
          id?: string
          plan?: string
          purchase_date?: string | null
          purchase_plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          created_at: string
          daily_logs: Json | null
          daily_reflections: Json | null
          future_self_entries: Json | null
          gamification: Json | null
          habits: Json | null
          id: string
          investment_goals: Json | null
          shopping_items: Json | null
          synced_at: string
          tracker_logs: Json | null
          trackers: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_logs?: Json | null
          daily_reflections?: Json | null
          future_self_entries?: Json | null
          gamification?: Json | null
          habits?: Json | null
          id?: string
          investment_goals?: Json | null
          shopping_items?: Json | null
          synced_at?: string
          tracker_logs?: Json | null
          trackers?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_logs?: Json | null
          daily_reflections?: Json | null
          future_self_entries?: Json | null
          gamification?: Json | null
          habits?: Json | null
          id?: string
          investment_goals?: Json | null
          shopping_items?: Json | null
          synced_at?: string
          tracker_logs?: Json | null
          trackers?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cohort_retention_weekly: {
        Row: {
          active_users: number | null
          cohort_week: string | null
          week_offset: number | null
        }
        Relationships: []
      }
      funnel_daily: {
        Row: {
          day: string | null
          event_count: number | null
          event_name: string | null
          unique_users: number | null
        }
        Relationships: []
      }
      revenue_daily: {
        Row: {
          amount_cents_sum: number | null
          day: string | null
          event_count: number | null
          event_type: string | null
          plan: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
