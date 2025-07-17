export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          state: string | null
          status: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      inspection_reports: {
        Row: {
          created_at: string
          estimated_cost: number | null
          findings: string | null
          id: string
          inspection_id: string | null
          photos_urls: string[] | null
          priority_level: string | null
          recommendations: string | null
          report_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          findings?: string | null
          id?: string
          inspection_id?: string | null
          photos_urls?: string[] | null
          priority_level?: string | null
          recommendations?: string | null
          report_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          findings?: string | null
          id?: string
          inspection_id?: string | null
          photos_urls?: string[] | null
          priority_level?: string | null
          recommendations?: string | null
          report_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_reports_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_date: string | null
          created_at: string
          id: string
          inspection_type: string | null
          inspector_id: string | null
          notes: string | null
          roof_id: string | null
          scheduled_date: string | null
          status: string | null
          updated_at: string
          weather_conditions: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type?: string | null
          inspector_id?: string | null
          notes?: string | null
          roof_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type?: string | null
          inspector_id?: string | null
          notes?: string | null
          roof_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_roof_id_fkey"
            columns: ["roof_id"]
            isOneToOne: false
            referencedRelation: "roofs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roofs: {
        Row: {
          address: string
          capital_budget_actual: string | null
          capital_budget_category: string | null
          capital_budget_completed: string | null
          capital_budget_estimated: number | null
          capital_budget_scope_of_work: string | null
          capital_budget_year: number | null
          city: string
          client_id: string | null
          created_at: string
          customer: string | null
          customer_sensitivity: string | null
          id: string
          install_date: string | null
          install_year: number | null
          installer_has_warranty: boolean | null
          installer_warranty_expiration: string | null
          installer_warranty_number: string | null
          installer_warranty_term: string | null
          installing_contractor: string | null
          is_deleted: boolean | null
          last_inspection_date: string | null
          manufacturer: string | null
          manufacturer_has_warranty: boolean | null
          manufacturer_warranty_expiration: string | null
          manufacturer_warranty_number: string | null
          manufacturer_warranty_term: string | null
          market: string | null
          next_inspection_due: string | null
          notes: string | null
          preventative_budget_actual: string | null
          preventative_budget_category: string | null
          preventative_budget_completed: string | null
          preventative_budget_estimated: number | null
          preventative_budget_scope_of_work: string | null
          preventative_budget_year: number | null
          property_code: string | null
          property_name: string
          region: string | null
          repair_contractor: string | null
          roof_access: string | null
          roof_access_location: string | null
          roof_access_requirements: string | null
          roof_access_safety_concern: string | null
          roof_area: number | null
          roof_area_unit: string | null
          roof_category: string | null
          roof_group: string | null
          roof_section: string | null
          roof_system: string | null
          roof_system_description: string | null
          roof_type: string | null
          site_contact: string | null
          site_contact_email: string | null
          site_contact_mobile_phone: string | null
          site_contact_office_phone: string | null
          state: string
          status: string | null
          total_leak_expense_12mo: string | null
          total_leaks_12mo: string | null
          updated_at: string
          warranty_expiration: string | null
          zip: string
        }
        Insert: {
          address: string
          capital_budget_actual?: string | null
          capital_budget_category?: string | null
          capital_budget_completed?: string | null
          capital_budget_estimated?: number | null
          capital_budget_scope_of_work?: string | null
          capital_budget_year?: number | null
          city: string
          client_id?: string | null
          created_at?: string
          customer?: string | null
          customer_sensitivity?: string | null
          id?: string
          install_date?: string | null
          install_year?: number | null
          installer_has_warranty?: boolean | null
          installer_warranty_expiration?: string | null
          installer_warranty_number?: string | null
          installer_warranty_term?: string | null
          installing_contractor?: string | null
          is_deleted?: boolean | null
          last_inspection_date?: string | null
          manufacturer?: string | null
          manufacturer_has_warranty?: boolean | null
          manufacturer_warranty_expiration?: string | null
          manufacturer_warranty_number?: string | null
          manufacturer_warranty_term?: string | null
          market?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          preventative_budget_actual?: string | null
          preventative_budget_category?: string | null
          preventative_budget_completed?: string | null
          preventative_budget_estimated?: number | null
          preventative_budget_scope_of_work?: string | null
          preventative_budget_year?: number | null
          property_code?: string | null
          property_name: string
          region?: string | null
          repair_contractor?: string | null
          roof_access?: string | null
          roof_access_location?: string | null
          roof_access_requirements?: string | null
          roof_access_safety_concern?: string | null
          roof_area?: number | null
          roof_area_unit?: string | null
          roof_category?: string | null
          roof_group?: string | null
          roof_section?: string | null
          roof_system?: string | null
          roof_system_description?: string | null
          roof_type?: string | null
          site_contact?: string | null
          site_contact_email?: string | null
          site_contact_mobile_phone?: string | null
          site_contact_office_phone?: string | null
          state: string
          status?: string | null
          total_leak_expense_12mo?: string | null
          total_leaks_12mo?: string | null
          updated_at?: string
          warranty_expiration?: string | null
          zip: string
        }
        Update: {
          address?: string
          capital_budget_actual?: string | null
          capital_budget_category?: string | null
          capital_budget_completed?: string | null
          capital_budget_estimated?: number | null
          capital_budget_scope_of_work?: string | null
          capital_budget_year?: number | null
          city?: string
          client_id?: string | null
          created_at?: string
          customer?: string | null
          customer_sensitivity?: string | null
          id?: string
          install_date?: string | null
          install_year?: number | null
          installer_has_warranty?: boolean | null
          installer_warranty_expiration?: string | null
          installer_warranty_number?: string | null
          installer_warranty_term?: string | null
          installing_contractor?: string | null
          is_deleted?: boolean | null
          last_inspection_date?: string | null
          manufacturer?: string | null
          manufacturer_has_warranty?: boolean | null
          manufacturer_warranty_expiration?: string | null
          manufacturer_warranty_number?: string | null
          manufacturer_warranty_term?: string | null
          market?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          preventative_budget_actual?: string | null
          preventative_budget_category?: string | null
          preventative_budget_completed?: string | null
          preventative_budget_estimated?: number | null
          preventative_budget_scope_of_work?: string | null
          preventative_budget_year?: number | null
          property_code?: string | null
          property_name?: string
          region?: string | null
          repair_contractor?: string | null
          roof_access?: string | null
          roof_access_location?: string | null
          roof_access_requirements?: string | null
          roof_access_safety_concern?: string | null
          roof_area?: number | null
          roof_area_unit?: string | null
          roof_category?: string | null
          roof_group?: string | null
          roof_section?: string | null
          roof_system?: string | null
          roof_system_description?: string | null
          roof_type?: string | null
          site_contact?: string | null
          site_contact_email?: string | null
          site_contact_mobile_phone?: string | null
          site_contact_office_phone?: string | null
          state?: string
          status?: string | null
          total_leak_expense_12mo?: string | null
          total_leaks_12mo?: string | null
          updated_at?: string
          warranty_expiration?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "roofs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          state: string | null
          status: string | null
          updated_at: string
          vendor_type: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          vendor_type?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          vendor_type?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          inspection_report_id: string | null
          priority: string | null
          roof_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: string | null
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          inspection_report_id?: string | null
          priority?: string | null
          roof_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          inspection_report_id?: string | null
          priority?: string | null
          roof_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_inspection_report_id_fkey"
            columns: ["inspection_report_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_roof_id_fkey"
            columns: ["roof_id"]
            isOneToOne: false
            referencedRelation: "roofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "inspector"
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
      app_role: ["super_admin", "manager", "inspector"],
    },
  },
} as const
