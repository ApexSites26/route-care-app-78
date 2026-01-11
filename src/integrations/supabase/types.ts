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
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string
          user_role: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id: string
          user_role: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_entries: {
        Row: {
          additional_comments: string | null
          afternoon_finish_time: string | null
          afternoon_start_time: string | null
          check_body_damage: boolean | null
          check_brakes: boolean | null
          check_cleanliness: boolean | null
          check_defects_reported: boolean | null
          check_first_aid_kit: boolean | null
          check_fluids: boolean | null
          check_hackney_plate: boolean | null
          check_horn: boolean | null
          check_indicators: boolean | null
          check_leaks: boolean | null
          check_lights: boolean | null
          check_mirrors: boolean | null
          check_no_excess_smoke: boolean | null
          check_tyres_wheels: boolean | null
          check_windows: boolean | null
          check_wipers_washers: boolean | null
          company_id: string | null
          created_at: string
          end_mileage: number | null
          entry_date: string
          id: string
          issues_text: string | null
          morning_finish_time: string | null
          morning_start_time: string | null
          no_issues: boolean
          start_mileage: number | null
          submitted_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          additional_comments?: string | null
          afternoon_finish_time?: string | null
          afternoon_start_time?: string | null
          check_body_damage?: boolean | null
          check_brakes?: boolean | null
          check_cleanliness?: boolean | null
          check_defects_reported?: boolean | null
          check_first_aid_kit?: boolean | null
          check_fluids?: boolean | null
          check_hackney_plate?: boolean | null
          check_horn?: boolean | null
          check_indicators?: boolean | null
          check_leaks?: boolean | null
          check_lights?: boolean | null
          check_mirrors?: boolean | null
          check_no_excess_smoke?: boolean | null
          check_tyres_wheels?: boolean | null
          check_windows?: boolean | null
          check_wipers_washers?: boolean | null
          company_id?: string | null
          created_at?: string
          end_mileage?: number | null
          entry_date?: string
          id?: string
          issues_text?: string | null
          morning_finish_time?: string | null
          morning_start_time?: string | null
          no_issues?: boolean
          start_mileage?: number | null
          submitted_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          additional_comments?: string | null
          afternoon_finish_time?: string | null
          afternoon_start_time?: string | null
          check_body_damage?: boolean | null
          check_brakes?: boolean | null
          check_cleanliness?: boolean | null
          check_defects_reported?: boolean | null
          check_first_aid_kit?: boolean | null
          check_fluids?: boolean | null
          check_hackney_plate?: boolean | null
          check_horn?: boolean | null
          check_indicators?: boolean | null
          check_leaks?: boolean | null
          check_lights?: boolean | null
          check_mirrors?: boolean | null
          check_no_excess_smoke?: boolean | null
          check_tyres_wheels?: boolean | null
          check_windows?: boolean | null
          check_wipers_washers?: boolean | null
          company_id?: string | null
          created_at?: string
          end_mileage?: number | null
          entry_date?: string
          id?: string
          issues_text?: string | null
          morning_finish_time?: string | null
          morning_start_time?: string | null
          no_issues?: boolean
          start_mileage?: number | null
          submitted_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      escort_entries: {
        Row: {
          afternoon_finish_time: string | null
          afternoon_start_time: string | null
          company_id: string | null
          created_at: string
          entry_date: string
          id: string
          issues_text: string | null
          morning_finish_time: string | null
          morning_start_time: string | null
          no_issues: boolean
          submitted_at: string
          user_id: string
        }
        Insert: {
          afternoon_finish_time?: string | null
          afternoon_start_time?: string | null
          company_id?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          issues_text?: string | null
          morning_finish_time?: string | null
          morning_start_time?: string | null
          no_issues?: boolean
          submitted_at?: string
          user_id: string
        }
        Update: {
          afternoon_finish_time?: string | null
          afternoon_start_time?: string | null
          company_id?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          issues_text?: string | null
          morning_finish_time?: string | null
          morning_start_time?: string | null
          no_issues?: boolean
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escort_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          contracted_hours: number | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          contracted_hours?: number | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          contracted_hours?: number | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      run_allocations: {
        Row: {
          company_id: string | null
          created_at: string
          day_of_week: number
          driver_id: string | null
          escort_id: string | null
          id: string
          is_active: boolean
          run_id: string
          shift_type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          day_of_week: number
          driver_id?: string | null
          escort_id?: string | null
          id?: string
          is_active?: boolean
          run_id: string
          shift_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          day_of_week?: number
          driver_id?: string | null
          escort_id?: string | null
          id?: string
          is_active?: boolean
          run_id?: string
          shift_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_allocations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_allocations_escort_id_fkey"
            columns: ["escort_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_allocations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "school_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      school_runs: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          pickup_time_home: string | null
          pickup_time_school: string | null
          run_code: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          pickup_time_home?: string | null
          pickup_time_school?: string | null
          run_code: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          pickup_time_home?: string | null
          pickup_time_school?: string | null
          run_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_maintenance: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          is_urgent: boolean
          maintenance_type: string
          vehicle_id: string
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          is_urgent?: boolean
          maintenance_type: string
          vehicle_id: string
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          is_urgent?: boolean
          maintenance_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          make: string | null
          model: string | null
          registration: string
          updated_at: string
        }
        Insert: {
          assigned_driver_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          registration: string
          updated_at?: string
        }
        Update: {
          assigned_driver_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          registration?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_staff_to_company: {
        Args: {
          _company_id: string
          _contracted_hours?: number
          _full_name: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      register_company: {
        Args: { company_name: string; user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "driver" | "escort" | "manager"
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
      app_role: ["driver", "escort", "manager"],
    },
  },
} as const
