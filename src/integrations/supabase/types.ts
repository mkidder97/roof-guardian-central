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
      budgets_and_repairs: {
        Row: {
          capital_budget_actual: number | null
          capital_budget_estimated: number | null
          capital_budget_year: number | null
          created_at: string
          id: string
          preventative_budget_actual: number | null
          preventative_budget_estimated: number | null
          property_id: string
          scope_of_work: string | null
          total_leak_expense_12mo: number | null
          total_leaks_12mo: number | null
          updated_at: string
        }
        Insert: {
          capital_budget_actual?: number | null
          capital_budget_estimated?: number | null
          capital_budget_year?: number | null
          created_at?: string
          id?: string
          preventative_budget_actual?: number | null
          preventative_budget_estimated?: number | null
          property_id: string
          scope_of_work?: string | null
          total_leak_expense_12mo?: number | null
          total_leaks_12mo?: number | null
          updated_at?: string
        }
        Update: {
          capital_budget_actual?: number | null
          capital_budget_estimated?: number | null
          capital_budget_year?: number | null
          created_at?: string
          id?: string
          preventative_budget_actual?: number | null
          preventative_budget_estimated?: number | null
          property_id?: string
          scope_of_work?: string | null
          total_leak_expense_12mo?: number | null
          total_leaks_12mo?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_and_repairs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          city: string
          created_at: string
          install_year: number | null
          market: string | null
          property_id: string
          property_name: string
          region: string | null
          roof_area: number | null
          roof_section: string | null
          roof_system: string | null
          site_contact_email: string | null
          site_contact_name: string | null
          site_contact_phone: string | null
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          install_year?: number | null
          market?: string | null
          property_id?: string
          property_name: string
          region?: string | null
          roof_area?: number | null
          roof_section?: string | null
          roof_system?: string | null
          site_contact_email?: string | null
          site_contact_name?: string | null
          site_contact_phone?: string | null
          state: string
          updated_at?: string
          zip: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          install_year?: number | null
          market?: string | null
          property_id?: string
          property_name?: string
          region?: string | null
          roof_area?: number | null
          roof_section?: string | null
          roof_system?: string | null
          site_contact_email?: string | null
          site_contact_name?: string | null
          site_contact_phone?: string | null
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      warranties: {
        Row: {
          contractor_name: string | null
          created_at: string
          expiration_date: string | null
          id: string
          installer_expiration_date: string | null
          installer_warranty_term: number | null
          manufacturer_name: string | null
          property_id: string
          updated_at: string
          warranty_term: number | null
        }
        Insert: {
          contractor_name?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          installer_expiration_date?: string | null
          installer_warranty_term?: number | null
          manufacturer_name?: string | null
          property_id: string
          updated_at?: string
          warranty_term?: number | null
        }
        Update: {
          contractor_name?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          installer_expiration_date?: string | null
          installer_warranty_term?: number | null
          manufacturer_name?: string | null
          property_id?: string
          updated_at?: string
          warranty_term?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
