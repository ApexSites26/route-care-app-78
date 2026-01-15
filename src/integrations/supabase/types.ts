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
      additional_runs: {
        Row: {
          company_id: string | null
          created_at: string
          entry_date: string
          entry_type: string
          finish_time: string
          id: string
          notes: string | null
          run_name: string
          start_time: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          entry_date?: string
          entry_type: string
          finish_time: string
          id?: string
          notes?: string | null
          run_name: string
          start_time: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          entry_date?: string
          entry_type?: string
          finish_time?: string
          id?: string
          notes?: string | null
          run_name?: string
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
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
      company_documents: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      garage_visits: {
        Row: {
          company_id: string | null
          created_at: string
          driver_id: string
          id: string
          mileage: number | null
          notes: string | null
          reason_type: string
          submitted_by: string
          vehicle_id: string
          visit_date: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          driver_id: string
          id?: string
          mileage?: number | null
          notes?: string | null
          reason_type: string
          submitted_by: string
          vehicle_id: string
          visit_date?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          mileage?: number | null
          notes?: string | null
          reason_type?: string
          submitted_by?: string
          vehicle_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_visits_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_visits_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          manager_email: string
          reminder_enabled: boolean
          reminder_time: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          manager_email: string
          reminder_enabled?: boolean
          reminder_time?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          manager_email?: string
          reminder_enabled?: boolean
          reminder_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          contract_start_date: string | null
          contracted_hours: number | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          contract_start_date?: string | null
          contracted_hours?: number | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          contract_start_date?: string | null
          contracted_hours?: number | null
          created_at?: string
          email?: string | null
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
      vehicle_defects: {
        Row: {
          action_taken: string | null
          company_id: string | null
          created_at: string
          date_corrected: string | null
          date_identified: string
          defect_description: string
          driver_entry_id: string | null
          id: string
          is_resolved: boolean
          reported_by: string
          resolved_by: string | null
          vehicle_id: string
        }
        Insert: {
          action_taken?: string | null
          company_id?: string | null
          created_at?: string
          date_corrected?: string | null
          date_identified?: string
          defect_description: string
          driver_entry_id?: string | null
          id?: string
          is_resolved?: boolean
          reported_by: string
          resolved_by?: string | null
          vehicle_id: string
        }
        Update: {
          action_taken?: string | null
          company_id?: string | null
          created_at?: string
          date_corrected?: string | null
          date_identified?: string
          defect_description?: string
          driver_entry_id?: string | null
          id?: string
          is_resolved?: boolean
          reported_by?: string
          resolved_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_defects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_defects_driver_entry_id_fkey"
            columns: ["driver_entry_id"]
            isOneToOne: false
            referencedRelation: "driver_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_defects_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_defects_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_defects_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_driver_history: {
        Row: {
          assigned_at: string
          company_id: string | null
          created_at: string
          driver_id: string
          id: string
          unassigned_at: string | null
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          company_id?: string | null
          created_at?: string
          driver_id: string
          id?: string
          unassigned_at?: string | null
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          company_id?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          unassigned_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_driver_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspection_links: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          vehicle_id: string
        }
        Insert: {
          access_token?: string
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          vehicle_id: string
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspection_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspection_links_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
          fuel_card_pin: string | null
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
          fuel_card_pin?: string | null
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
          fuel_card_pin?: string | null
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
      workshop_records: {
        Row: {
          company_id: string | null
          created_at: string
          date_left: string
          date_returned: string | null
          garage_name: string
          id: string
          submitted_by: string
          vehicle_id: string
          work_carried_out: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          date_left: string
          date_returned?: string | null
          garage_name: string
          id?: string
          submitted_by: string
          vehicle_id: string
          work_carried_out: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          date_left?: string
          date_returned?: string | null
          garage_name?: string
          id?: string
          submitted_by?: string
          vehicle_id?: string
          work_carried_out?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_staff_to_company:
        | {
            Args: {
              _company_id: string
              _contracted_hours?: number
              _full_name: string
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _company_id: string
              _contracted_hours?: number
              _email?: string
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
      get_vehicle_diary_for_inspection: {
        Args: { p_date_from?: string; p_date_to?: string; p_token: string }
        Returns: Json
      }
      get_vehicle_for_inspection: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          company_name: string
          make: string
          model: string
          registration: string
          vehicle_id: string
        }[]
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
