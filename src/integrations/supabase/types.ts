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
      campaign_communications: {
        Row: {
          campaign_id: string | null
          cc_emails: string[] | null
          communication_type: string | null
          created_at: string | null
          direction: string | null
          from_email: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          message_content: string | null
          read_at: string | null
          received_at: string | null
          sent_at: string | null
          subject: string | null
          to_email: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          cc_emails?: string[] | null
          communication_type?: string | null
          created_at?: string | null
          direction?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          message_content?: string | null
          read_at?: string | null
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          cc_emails?: string[] | null
          communication_type?: string | null
          created_at?: string | null
          direction?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          message_content?: string | null
          read_at?: string | null
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_communications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "inspection_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_properties: {
        Row: {
          automation_data: Json | null
          campaign_id: string | null
          completed_date: string | null
          created_at: string | null
          error_message: string | null
          id: string
          inspector_id: string | null
          n8n_property_id: string | null
          risk_assessment: Json | null
          roof_id: string | null
          scheduled_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          automation_data?: Json | null
          campaign_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          inspector_id?: string | null
          n8n_property_id?: string | null
          risk_assessment?: Json | null
          roof_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          automation_data?: Json | null
          campaign_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          inspector_id?: string | null
          n8n_property_id?: string | null
          risk_assessment?: Json | null
          roof_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_properties_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "inspection_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_properties_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "campaign_properties_roof_id_fkey"
            columns: ["roof_id"]
            isOneToOne: false
            referencedRelation: "roofs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_name: string
          mobile_phone: string | null
          notes: string | null
          office_phone: string | null
          role: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_name: string
          mobile_phone?: string | null
          notes?: string | null
          office_phone?: string | null
          role?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_name?: string
          mobile_phone?: string | null
          notes?: string | null
          office_phone?: string | null
          role?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      file_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      grouping_configurations: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          rules: Json
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          rules?: Json
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          rules?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grouping_configurations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_campaigns: {
        Row: {
          actual_completion: string | null
          automation_settings: Json | null
          client_id: string | null
          completed_at: string | null
          completed_properties: number | null
          contact_preferences: Json | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          estimated_completion: string | null
          failed_properties: number | null
          id: string
          inspection_type: string
          market: string | null
          metadata: Json | null
          n8n_execution_id: string | null
          n8n_workflow_id: string | null
          name: string
          progress_percentage: number | null
          region: string | null
          status: string | null
          total_properties: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actual_completion?: string | null
          automation_settings?: Json | null
          client_id?: string | null
          completed_at?: string | null
          completed_properties?: number | null
          contact_preferences?: Json | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          failed_properties?: number | null
          id?: string
          inspection_type: string
          market?: string | null
          metadata?: Json | null
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          name: string
          progress_percentage?: number | null
          region?: string | null
          status?: string | null
          total_properties: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actual_completion?: string | null
          automation_settings?: Json | null
          client_id?: string | null
          completed_at?: string | null
          completed_properties?: number | null
          contact_preferences?: Json | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          failed_properties?: number | null
          id?: string
          inspection_type?: string
          market?: string | null
          metadata?: Json | null
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          name?: string
          progress_percentage?: number | null
          region?: string | null
          status?: string | null
          total_properties?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_capital_expenses: {
        Row: {
          created_at: string
          description: string
          estimated_cost: number
          expense_type: string
          id: string
          inspection_id: string
          priority: string | null
          recommended_timeline: string | null
        }
        Insert: {
          created_at?: string
          description: string
          estimated_cost: number
          expense_type: string
          id?: string
          inspection_id: string
          priority?: string | null
          recommended_timeline?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          estimated_cost?: number
          expense_type?: string
          id?: string
          inspection_id?: string
          priority?: string | null
          recommended_timeline?: string | null
        }
        Relationships: []
      }
      inspection_deficiencies: {
        Row: {
          created_at: string
          deficiency_type: string
          description: string
          estimated_cost: number | null
          id: string
          inspection_id: string
          location_description: string | null
          photo_urls: string[] | null
          priority_level: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deficiency_type: string
          description: string
          estimated_cost?: number | null
          id?: string
          inspection_id: string
          location_description?: string | null
          photo_urls?: string[] | null
          priority_level?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deficiency_type?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          inspection_id?: string
          location_description?: string | null
          photo_urls?: string[] | null
          priority_level?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspection_photos: {
        Row: {
          caption: string | null
          created_at: string
          deficiency_id: string | null
          file_url: string
          id: string
          inspection_id: string
          metadata: Json | null
          photo_type: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          deficiency_id?: string | null
          file_url: string
          id?: string
          inspection_id: string
          metadata?: Json | null
          photo_type?: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          deficiency_id?: string | null
          file_url?: string
          id?: string
          inspection_id?: string
          metadata?: Json | null
          photo_type?: string
          storage_path?: string
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
      inspection_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          inspection_id: string | null
          inspector_id: string
          last_updated: string
          property_id: string
          session_data: Json
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          inspection_id?: string | null
          inspector_id: string
          last_updated?: string
          property_id: string
          session_data?: Json
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          inspection_id?: string | null
          inspector_id?: string
          last_updated?: string
          property_id?: string
          session_data?: Json
          status?: string
        }
        Relationships: []
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
      inspector_routes: {
        Row: {
          created_at: string | null
          estimated_travel_time: number | null
          id: string
          inspector_id: string
          optimization_score: number | null
          property_sequence: Json
          route_date: string
          total_distance: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_travel_time?: number | null
          id?: string
          inspector_id: string
          optimization_score?: number | null
          property_sequence?: Json
          route_date: string
          total_distance?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_travel_time?: number | null
          id?: string
          inspector_id?: string
          optimization_score?: number | null
          property_sequence?: Json
          route_date?: string
          total_distance?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      property_contact_assignments: {
        Row: {
          assigned_date: string | null
          assignment_type: string
          contact_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          roof_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_date?: string | null
          assignment_type?: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          roof_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_date?: string | null
          assignment_type?: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          roof_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_contact_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contact_assignments_roof_id_fkey"
            columns: ["roof_id"]
            isOneToOne: false
            referencedRelation: "roofs"
            referencedColumns: ["id"]
          },
        ]
      }
      property_groups: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          group_type: string
          id: string
          metadata: Json | null
          name: string
          properties: Json
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_type: string
          id?: string
          metadata?: Json | null
          name: string
          properties?: Json
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_type?: string
          id?: string
          metadata?: Json | null
          name?: string
          properties?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      roof_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_public: boolean | null
          mime_type: string | null
          roof_id: string | null
          storage_path: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          roof_id?: string | null
          storage_path?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          roof_id?: string | null
          storage_path?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roof_files_roof_id_fkey"
            columns: ["roof_id"]
            isOneToOne: false
            referencedRelation: "roofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roof_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roofs: {
        Row: {
          access_location: string | null
          access_requirements: string | null
          address: string
          asset_manager_email: string | null
          asset_manager_name: string | null
          asset_manager_phone: string | null
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
          drainage_system: string | null
          estimated_lttr_value: number | null
          flashing_detail: string | null
          has_daylighting: boolean | null
          has_solar: boolean | null
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
          latitude: number | null
          longitude: number | null
          maintenance_contact_name: string | null
          maintenance_contact_phone: string | null
          manufacturer: string | null
          manufacturer_has_warranty: boolean | null
          manufacturer_warranty_expiration: string | null
          manufacturer_warranty_number: string | null
          manufacturer_warranty_term: string | null
          market: string | null
          next_inspection_due: string | null
          notes: string | null
          occupant_concern: string | null
          perimeter_detail: string | null
          preventative_budget_actual: string | null
          preventative_budget_category: string | null
          preventative_budget_completed: string | null
          preventative_budget_estimated: number | null
          preventative_budget_scope_of_work: string | null
          preventative_budget_year: number | null
          property_code: string | null
          property_manager_email: string | null
          property_manager_mobile: string | null
          property_manager_name: string | null
          property_manager_phone: string | null
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
          roof_rating: number | null
          roof_section: string | null
          roof_system: string | null
          roof_system_description: string | null
          roof_type: string | null
          safety_concerns: boolean | null
          site_contact: string | null
          site_contact_email: string | null
          site_contact_mobile_phone: string | null
          site_contact_name: string | null
          site_contact_office_phone: string | null
          site_contact_phone: string | null
          state: string
          status: string | null
          time_zone: string | null
          total_leak_expense_12mo: string | null
          total_leaks_12mo: string | null
          updated_at: string
          warranty_expiration: string | null
          zip: string
        }
        Insert: {
          access_location?: string | null
          access_requirements?: string | null
          address: string
          asset_manager_email?: string | null
          asset_manager_name?: string | null
          asset_manager_phone?: string | null
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
          drainage_system?: string | null
          estimated_lttr_value?: number | null
          flashing_detail?: string | null
          has_daylighting?: boolean | null
          has_solar?: boolean | null
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
          latitude?: number | null
          longitude?: number | null
          maintenance_contact_name?: string | null
          maintenance_contact_phone?: string | null
          manufacturer?: string | null
          manufacturer_has_warranty?: boolean | null
          manufacturer_warranty_expiration?: string | null
          manufacturer_warranty_number?: string | null
          manufacturer_warranty_term?: string | null
          market?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          occupant_concern?: string | null
          perimeter_detail?: string | null
          preventative_budget_actual?: string | null
          preventative_budget_category?: string | null
          preventative_budget_completed?: string | null
          preventative_budget_estimated?: number | null
          preventative_budget_scope_of_work?: string | null
          preventative_budget_year?: number | null
          property_code?: string | null
          property_manager_email?: string | null
          property_manager_mobile?: string | null
          property_manager_name?: string | null
          property_manager_phone?: string | null
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
          roof_rating?: number | null
          roof_section?: string | null
          roof_system?: string | null
          roof_system_description?: string | null
          roof_type?: string | null
          safety_concerns?: boolean | null
          site_contact?: string | null
          site_contact_email?: string | null
          site_contact_mobile_phone?: string | null
          site_contact_name?: string | null
          site_contact_office_phone?: string | null
          site_contact_phone?: string | null
          state: string
          status?: string | null
          time_zone?: string | null
          total_leak_expense_12mo?: string | null
          total_leaks_12mo?: string | null
          updated_at?: string
          warranty_expiration?: string | null
          zip: string
        }
        Update: {
          access_location?: string | null
          access_requirements?: string | null
          address?: string
          asset_manager_email?: string | null
          asset_manager_name?: string | null
          asset_manager_phone?: string | null
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
          drainage_system?: string | null
          estimated_lttr_value?: number | null
          flashing_detail?: string | null
          has_daylighting?: boolean | null
          has_solar?: boolean | null
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
          latitude?: number | null
          longitude?: number | null
          maintenance_contact_name?: string | null
          maintenance_contact_phone?: string | null
          manufacturer?: string | null
          manufacturer_has_warranty?: boolean | null
          manufacturer_warranty_expiration?: string | null
          manufacturer_warranty_number?: string | null
          manufacturer_warranty_term?: string | null
          market?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          occupant_concern?: string | null
          perimeter_detail?: string | null
          preventative_budget_actual?: string | null
          preventative_budget_category?: string | null
          preventative_budget_completed?: string | null
          preventative_budget_estimated?: number | null
          preventative_budget_scope_of_work?: string | null
          preventative_budget_year?: number | null
          property_code?: string | null
          property_manager_email?: string | null
          property_manager_mobile?: string | null
          property_manager_name?: string | null
          property_manager_phone?: string | null
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
          roof_rating?: number | null
          roof_section?: string | null
          roof_system?: string | null
          roof_system_description?: string | null
          roof_type?: string | null
          safety_concerns?: boolean | null
          site_contact?: string | null
          site_contact_email?: string | null
          site_contact_mobile_phone?: string | null
          site_contact_name?: string | null
          site_contact_office_phone?: string | null
          site_contact_phone?: string | null
          state?: string
          status?: string | null
          time_zone?: string | null
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
      seasonal_preferences: {
        Row: {
          avoid_conditions: string[] | null
          client_id: string | null
          created_at: string | null
          id: string
          optimal_temperature_range: Json | null
          preferred_months: number[] | null
          region: string | null
          season: string | null
          updated_at: string | null
        }
        Insert: {
          avoid_conditions?: string[] | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          optimal_temperature_range?: Json | null
          preferred_months?: number[] | null
          region?: string | null
          season?: string | null
          updated_at?: string | null
        }
        Update: {
          avoid_conditions?: string[] | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          optimal_temperature_range?: Json | null
          preferred_months?: number[] | null
          region?: string | null
          season?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_preferences_client_id_fkey"
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
      calculate_property_proximity: {
        Args: {
          property1_lat: number
          property1_lng: number
          property2_lat: number
          property2_lng: number
        }
        Returns: number
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_inspection_from_session: {
        Args: { p_session_id: string; p_final_notes?: string }
        Returns: string
      }
      create_direct_inspection: {
        Args: {
          p_roof_id: string
          p_inspector_id: string
          p_scheduled_date: string
          p_inspection_type?: string
          p_notes?: string
        }
        Returns: string
      }
      generate_campaign_name: {
        Args: {
          p_market: string
          p_inspection_type: string
          p_total_properties: number
        }
        Returns: string
      }
      generate_intelligent_groups: {
        Args: {
          p_client_id?: string
          p_group_type?: string
          p_max_group_size?: number
          p_max_distance_miles?: number
        }
        Returns: {
          group_id: number
          property_id: string
          property_name: string
          group_center_lat: number
          group_center_lng: number
          optimization_score: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_inspector_inspections: {
        Args: { p_inspector_id: string }
        Returns: {
          inspection_id: string
          property_id: string
          property_name: string
          property_address: string
          city: string
          state: string
          roof_type: string
          roof_area: number
          scheduled_date: string
          completed_date: string
          status: string
          inspection_type: string
          notes: string
          session_id: string
          session_status: string
          session_data: Json
          last_inspection_date: string
        }[]
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
