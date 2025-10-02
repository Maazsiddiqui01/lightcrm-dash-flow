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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          added_date: string
          article_date: string | null
          article_link: string
          created_at: string
          focus_area: string
          id: string
          last_date_to_use: string | null
          updated_at: string
        }
        Insert: {
          added_date?: string
          article_date?: string | null
          article_link: string
          created_at?: string
          focus_area: string
          id?: string
          last_date_to_use?: string | null
          updated_at?: string
        }
        Update: {
          added_date?: string
          article_date?: string | null
          article_link?: string
          created_at?: string
          focus_area?: string
          id?: string
          last_date_to_use?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_email_builder_settings: {
        Row: {
          contact_id: string
          created_at: string | null
          delta_type: string | null
          last_updated: string | null
          module_states: Json
          selected_article_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          delta_type?: string | null
          last_updated?: string | null
          module_states?: Json
          selected_article_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          delta_type?: string | null
          last_updated?: string | null
          module_states?: Json
          selected_article_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_ai"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_computed"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_raw"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_with_dynamic_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_with_opportunities_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "tom_new_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "v_contact_email_composer"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "v_contact_lag"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_email_builder_settings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "v_contact_top_opps"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contact_intentional_no_outreach_events: {
        Row: {
          action_type: string
          contact_id: string
          created_at: string
          id: string
          note: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action_type?: string
          contact_id: string
          created_at?: string
          id?: string
          note?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action_type?: string
          contact_id?: string
          created_at?: string
          id?: string
          note?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      contact_note_events: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          created_by: string | null
          field: string
          id: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          created_by?: string | null
          field?: string
          id?: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          field?: string
          id?: string
        }
        Relationships: []
      }
      contacts_dismissed_emails: {
        Row: {
          dismissed_at: string | null
          email: string
          note: string | null
        }
        Insert: {
          dismissed_at?: string | null
          email: string
          note?: string | null
        }
        Update: {
          dismissed_at?: string | null
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      contacts_missing_candidates: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: number
          organization: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: number
          organization?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: number
          organization?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts_raw: {
        Row: {
          all_emails: string | null
          all_opps: number | null
          areas_of_specialization: string | null
          category: string | null
          city: string | null
          contact_type: string | null
          created_at: string | null
          days_since_last_email: number | null
          days_since_last_meeting: number | null
          delta: number | null
          delta_type: string | null
          email_address: string | null
          email_cc: string | null
          email_from: string | null
          email_subject: string | null
          email_to: string | null
          first_name: string | null
          full_name: string | null
          group_contact: string | null
          id: string
          intentional_no_outreach: boolean | null
          intentional_no_outreach_date: string | null
          intentional_no_outreach_note: string | null
          last_name: string | null
          latest_contact_email: string | null
          latest_contact_meeting: string | null
          lg_assistant: string | null
          lg_focus_area_1: string | null
          lg_focus_area_2: string | null
          lg_focus_area_3: string | null
          lg_focus_area_4: string | null
          lg_focus_area_5: string | null
          lg_focus_area_6: string | null
          lg_focus_area_7: string | null
          lg_focus_area_8: string | null
          lg_focus_areas_comprehensive_list: string | null
          lg_lead: string | null
          lg_sector: string | null
          linkedin_url: string | null
          meeting_cc: string | null
          meeting_from: string | null
          meeting_title: string | null
          meeting_to: string | null
          most_recent_contact: string | null
          most_recent_group_contact: string | null
          no_of_lg_focus_areas: number | null
          no_of_opps_sourced: number | null
          notes: string | null
          of_emails: number | null
          of_meetings: number | null
          organization: string | null
          outreach_date: string | null
          phone: string | null
          state: string | null
          title: string | null
          total_of_contacts: number | null
          updated_at: string | null
          url_to_online_bio: string | null
          x_twitter_url: string | null
        }
        Insert: {
          all_emails?: string | null
          all_opps?: number | null
          areas_of_specialization?: string | null
          category?: string | null
          city?: string | null
          contact_type?: string | null
          created_at?: string | null
          days_since_last_email?: number | null
          days_since_last_meeting?: number | null
          delta?: number | null
          delta_type?: string | null
          email_address?: string | null
          email_cc?: string | null
          email_from?: string | null
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          group_contact?: string | null
          id?: string
          intentional_no_outreach?: boolean | null
          intentional_no_outreach_date?: string | null
          intentional_no_outreach_note?: string | null
          last_name?: string | null
          latest_contact_email?: string | null
          latest_contact_meeting?: string | null
          lg_assistant?: string | null
          lg_focus_area_1?: string | null
          lg_focus_area_2?: string | null
          lg_focus_area_3?: string | null
          lg_focus_area_4?: string | null
          lg_focus_area_5?: string | null
          lg_focus_area_6?: string | null
          lg_focus_area_7?: string | null
          lg_focus_area_8?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_lead?: string | null
          lg_sector?: string | null
          linkedin_url?: string | null
          meeting_cc?: string | null
          meeting_from?: string | null
          meeting_title?: string | null
          meeting_to?: string | null
          most_recent_contact?: string | null
          most_recent_group_contact?: string | null
          no_of_lg_focus_areas?: number | null
          no_of_opps_sourced?: number | null
          notes?: string | null
          of_emails?: number | null
          of_meetings?: number | null
          organization?: string | null
          outreach_date?: string | null
          phone?: string | null
          state?: string | null
          title?: string | null
          total_of_contacts?: number | null
          updated_at?: string | null
          url_to_online_bio?: string | null
          x_twitter_url?: string | null
        }
        Update: {
          all_emails?: string | null
          all_opps?: number | null
          areas_of_specialization?: string | null
          category?: string | null
          city?: string | null
          contact_type?: string | null
          created_at?: string | null
          days_since_last_email?: number | null
          days_since_last_meeting?: number | null
          delta?: number | null
          delta_type?: string | null
          email_address?: string | null
          email_cc?: string | null
          email_from?: string | null
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          group_contact?: string | null
          id?: string
          intentional_no_outreach?: boolean | null
          intentional_no_outreach_date?: string | null
          intentional_no_outreach_note?: string | null
          last_name?: string | null
          latest_contact_email?: string | null
          latest_contact_meeting?: string | null
          lg_assistant?: string | null
          lg_focus_area_1?: string | null
          lg_focus_area_2?: string | null
          lg_focus_area_3?: string | null
          lg_focus_area_4?: string | null
          lg_focus_area_5?: string | null
          lg_focus_area_6?: string | null
          lg_focus_area_7?: string | null
          lg_focus_area_8?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_lead?: string | null
          lg_sector?: string | null
          linkedin_url?: string | null
          meeting_cc?: string | null
          meeting_from?: string | null
          meeting_title?: string | null
          meeting_to?: string | null
          most_recent_contact?: string | null
          most_recent_group_contact?: string | null
          no_of_lg_focus_areas?: number | null
          no_of_opps_sourced?: number | null
          notes?: string | null
          of_emails?: number | null
          of_meetings?: number | null
          organization?: string | null
          outreach_date?: string | null
          phone?: string | null
          state?: string | null
          title?: string | null
          total_of_contacts?: number | null
          updated_at?: string | null
          url_to_online_bio?: string | null
          x_twitter_url?: string | null
        }
        Relationships: []
      }
      contacts_raw_dedupe_backup_2025_09_10: {
        Row: {
          all_emails: string | null
          all_opps: number | null
          areas_of_specialization: string | null
          category: string | null
          contact_type: string | null
          created_at: string | null
          days_since_last_email: number | null
          days_since_last_meeting: number | null
          delta: number | null
          delta_type: string | null
          email_address: string | null
          email_cc: string | null
          email_from: string | null
          email_lower: string | null
          email_subject: string | null
          email_to: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          latest_contact_email: string | null
          latest_contact_meeting: string | null
          lg_focus_area_1: string | null
          lg_focus_area_2: string | null
          lg_focus_area_3: string | null
          lg_focus_area_4: string | null
          lg_focus_area_5: string | null
          lg_focus_area_6: string | null
          lg_focus_area_7: string | null
          lg_focus_area_8: string | null
          lg_focus_areas_comprehensive_list: string | null
          lg_sector: string | null
          meeting_cc: string | null
          meeting_from: string | null
          meeting_title: string | null
          meeting_to: string | null
          most_recent_contact: string | null
          no_of_lg_focus_areas: number | null
          no_of_opps_sourced: number | null
          notes: string | null
          of_emails: number | null
          of_meetings: number | null
          organization: string | null
          outreach_date: string | null
          phone: string | null
          rn: number | null
          title: string | null
          total_of_contacts: number | null
          updated_at: string | null
          url_to_online_bio: string | null
        }
        Insert: {
          all_emails?: string | null
          all_opps?: number | null
          areas_of_specialization?: string | null
          category?: string | null
          contact_type?: string | null
          created_at?: string | null
          days_since_last_email?: number | null
          days_since_last_meeting?: number | null
          delta?: number | null
          delta_type?: string | null
          email_address?: string | null
          email_cc?: string | null
          email_from?: string | null
          email_lower?: string | null
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          latest_contact_email?: string | null
          latest_contact_meeting?: string | null
          lg_focus_area_1?: string | null
          lg_focus_area_2?: string | null
          lg_focus_area_3?: string | null
          lg_focus_area_4?: string | null
          lg_focus_area_5?: string | null
          lg_focus_area_6?: string | null
          lg_focus_area_7?: string | null
          lg_focus_area_8?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_sector?: string | null
          meeting_cc?: string | null
          meeting_from?: string | null
          meeting_title?: string | null
          meeting_to?: string | null
          most_recent_contact?: string | null
          no_of_lg_focus_areas?: number | null
          no_of_opps_sourced?: number | null
          notes?: string | null
          of_emails?: number | null
          of_meetings?: number | null
          organization?: string | null
          outreach_date?: string | null
          phone?: string | null
          rn?: number | null
          title?: string | null
          total_of_contacts?: number | null
          updated_at?: string | null
          url_to_online_bio?: string | null
        }
        Update: {
          all_emails?: string | null
          all_opps?: number | null
          areas_of_specialization?: string | null
          category?: string | null
          contact_type?: string | null
          created_at?: string | null
          days_since_last_email?: number | null
          days_since_last_meeting?: number | null
          delta?: number | null
          delta_type?: string | null
          email_address?: string | null
          email_cc?: string | null
          email_from?: string | null
          email_lower?: string | null
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          latest_contact_email?: string | null
          latest_contact_meeting?: string | null
          lg_focus_area_1?: string | null
          lg_focus_area_2?: string | null
          lg_focus_area_3?: string | null
          lg_focus_area_4?: string | null
          lg_focus_area_5?: string | null
          lg_focus_area_6?: string | null
          lg_focus_area_7?: string | null
          lg_focus_area_8?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_sector?: string | null
          meeting_cc?: string | null
          meeting_from?: string | null
          meeting_title?: string | null
          meeting_to?: string | null
          most_recent_contact?: string | null
          no_of_lg_focus_areas?: number | null
          no_of_opps_sourced?: number | null
          notes?: string | null
          of_emails?: number | null
          of_meetings?: number | null
          organization?: string | null
          outreach_date?: string | null
          phone?: string | null
          rn?: number | null
          title?: string | null
          total_of_contacts?: number | null
          updated_at?: string | null
          url_to_online_bio?: string | null
        }
        Relationships: []
      }
      email_template_settings: {
        Row: {
          days_range_config: Json | null
          inquiry_config: Json | null
          length_override: string | null
          module_states: Json | null
          personalization_config: Json | null
          quality_rules: Json | null
          subject_pool_override: string | null
          template_id: string
          tone_override: string | null
        }
        Insert: {
          days_range_config?: Json | null
          inquiry_config?: Json | null
          length_override?: string | null
          module_states?: Json | null
          personalization_config?: Json | null
          quality_rules?: Json | null
          subject_pool_override?: string | null
          template_id: string
          tone_override?: string | null
        }
        Update: {
          days_range_config?: Json | null
          inquiry_config?: Json | null
          length_override?: string | null
          module_states?: Json | null
          personalization_config?: Json | null
          quality_rules?: Json | null
          subject_pool_override?: string | null
          template_id?: string
          tone_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_settings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          custom_insertion: string | null
          custom_instructions: string | null
          delta_type: string | null
          description: string | null
          fa_bucket: number | null
          gb_present: boolean | null
          has_opps: boolean | null
          hs_present: boolean | null
          id: string
          is_preset: boolean
          ls_present: boolean | null
          max_opps: number | null
          name: string
          subject_mode: string | null
        }
        Insert: {
          created_at?: string | null
          custom_insertion?: string | null
          custom_instructions?: string | null
          delta_type?: string | null
          description?: string | null
          fa_bucket?: number | null
          gb_present?: boolean | null
          has_opps?: boolean | null
          hs_present?: boolean | null
          id?: string
          is_preset?: boolean
          ls_present?: boolean | null
          max_opps?: number | null
          name: string
          subject_mode?: string | null
        }
        Update: {
          created_at?: string | null
          custom_insertion?: string | null
          custom_instructions?: string | null
          delta_type?: string | null
          description?: string | null
          fa_bucket?: number | null
          gb_present?: boolean | null
          has_opps?: boolean | null
          hs_present?: boolean | null
          id?: string
          is_preset?: boolean
          ls_present?: boolean | null
          max_opps?: number | null
          name?: string
          subject_mode?: string | null
        }
        Relationships: []
      }
      emails_meetings_raw: {
        Row: {
          all_emails: string | null
          cc_emails: string | null
          cc_names: string | null
          created_at: string | null
          emails_arr: string[] | null
          end_time: string | null
          from_email: string | null
          from_name: string | null
          id: string
          occurred_at: string | null
          organization: string | null
          quarter_text: string | null
          source: string | null
          subject: string | null
          time: string | null
          to_emails: string | null
          to_names: string | null
          updated_at: string | null
          year_text: string | null
        }
        Insert: {
          all_emails?: string | null
          cc_emails?: string | null
          cc_names?: string | null
          created_at?: string | null
          emails_arr?: string[] | null
          end_time?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          occurred_at?: string | null
          organization?: string | null
          quarter_text?: string | null
          source?: string | null
          subject?: string | null
          time?: string | null
          to_emails?: string | null
          to_names?: string | null
          updated_at?: string | null
          year_text?: string | null
        }
        Update: {
          all_emails?: string | null
          cc_emails?: string | null
          cc_names?: string | null
          created_at?: string | null
          emails_arr?: string[] | null
          end_time?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          occurred_at?: string | null
          organization?: string | null
          quarter_text?: string | null
          source?: string | null
          subject?: string | null
          time?: string | null
          to_emails?: string | null
          to_names?: string | null
          updated_at?: string | null
          year_text?: string | null
        }
        Relationships: []
      }
      focus_area_description: {
        Row: {
          Description: string | null
          "Existing Platform (for Add-Ons)": string | null
          id: string | null
          "LG Focus Area": string | null
          "LG Sector": string | null
          "Platform / Add-On": string | null
          Unique_ID: number
        }
        Insert: {
          Description?: string | null
          "Existing Platform (for Add-Ons)"?: string | null
          id?: string | null
          "LG Focus Area"?: string | null
          "LG Sector"?: string | null
          "Platform / Add-On"?: string | null
          Unique_ID?: number
        }
        Update: {
          Description?: string | null
          "Existing Platform (for Add-Ons)"?: string | null
          id?: string | null
          "LG Focus Area"?: string | null
          "LG Sector"?: string | null
          "Platform / Add-On"?: string | null
          Unique_ID?: number
        }
        Relationships: []
      }
      focus_area_descriptions: {
        Row: {
          created_at: string
          Description: string | null
          "Existing Platform (for Add-Ons)": string | null
          id: number
          "LG Focus Area": string | null
          "LG Sector": string | null
          "Platform / Add-On": string | null
        }
        Insert: {
          created_at?: string
          Description?: string | null
          "Existing Platform (for Add-Ons)"?: string | null
          id?: number
          "LG Focus Area"?: string | null
          "LG Sector"?: string | null
          "Platform / Add-On"?: string | null
        }
        Update: {
          created_at?: string
          Description?: string | null
          "Existing Platform (for Add-Ons)"?: string | null
          id?: number
          "LG Focus Area"?: string | null
          "LG Sector"?: string | null
          "Platform / Add-On"?: string | null
        }
        Relationships: []
      }
      inquiry_library: {
        Row: {
          category: string
          created_at: string
          id: string
          inquiry_text: string
          is_global: boolean
          sync_behavior: string | null
          template_id: string | null
          tri_state: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          inquiry_text: string
          is_global?: boolean
          sync_behavior?: string | null
          template_id?: string | null
          tri_state?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          inquiry_text?: string
          is_global?: boolean
          sync_behavior?: string | null
          template_id?: string | null
          tri_state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_library_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_rotation_log: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          inquiry_id: string
          used_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          inquiry_id: string
          used_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          inquiry_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_rotation_log_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiry_library"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions_n8n: {
        Row: {
          all_emails: string | null
          all_names: string | null
          cc_emails: string | null
          cc_names: string | null
          created_at: string
          from_email: string | null
          from_name: string | null
          occured_at: string | null
          source: string | null
          subject: string | null
          to_emails: string | null
          to_names: string | null
        }
        Insert: {
          all_emails?: string | null
          all_names?: string | null
          cc_emails?: string | null
          cc_names?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          occured_at?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          to_names?: string | null
        }
        Update: {
          all_emails?: string | null
          all_names?: string | null
          cc_emails?: string | null
          cc_names?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          occured_at?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          to_names?: string | null
        }
        Relationships: []
      }
      kpi_filter_values: {
        Row: {
          created_at: string | null
          focus_areas: string[] | null
          id: string
          lg_leads: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          focus_areas?: string[] | null
          id?: string
          lg_leads?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          focus_areas?: string[] | null
          id?: string
          lg_leads?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lg_focus_area_directory: {
        Row: {
          assistant_email: string | null
          assistant_name: string | null
          focus_area: string
          lead1_email: string | null
          lead1_name: string | null
          lead2_email: string | null
          lead2_name: string | null
        }
        Insert: {
          assistant_email?: string | null
          assistant_name?: string | null
          focus_area: string
          lead1_email?: string | null
          lead1_name?: string | null
          lead2_email?: string | null
          lead2_name?: string | null
        }
        Update: {
          assistant_email?: string | null
          assistant_name?: string | null
          focus_area?: string
          lead1_email?: string | null
          lead1_name?: string | null
          lead2_email?: string | null
          lead2_name?: string | null
        }
        Relationships: []
      }
      lg_focus_area_master: {
        Row: {
          created_at: string
          focus_area: string
          is_active: boolean
          sector: string
        }
        Insert: {
          created_at?: string
          focus_area: string
          is_active?: boolean
          sector: string
        }
        Update: {
          created_at?: string
          focus_area?: string
          is_active?: boolean
          sector?: string
        }
        Relationships: []
      }
      lg_leads_directory: {
        Row: {
          email: string
          last_name: string | null
          lead_name: string
        }
        Insert: {
          email: string
          last_name?: string | null
          lead_name: string
        }
        Update: {
          email?: string
          last_name?: string | null
          lead_name?: string
        }
        Relationships: []
      }
      lookup_focus_areas: {
        Row: {
          id: string
          label: string
          sector_id: string
        }
        Insert: {
          id: string
          label: string
          sector_id: string
        }
        Update: {
          id?: string
          label?: string
          sector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lookup_focus_areas_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "lookup_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      lookup_sectors: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      master_template_defaults: {
        Row: {
          created_at: string | null
          days_max: number | null
          days_min: number
          default_modules: Json | null
          length: string
          master_key: string
          subject_style: string
          tone: string
        }
        Insert: {
          created_at?: string | null
          days_max?: number | null
          days_min: number
          default_modules?: Json | null
          length: string
          master_key: string
          subject_style: string
          tone: string
        }
        Update: {
          created_at?: string | null
          days_max?: number | null
          days_min?: number
          default_modules?: Json | null
          length?: string
          master_key?: string
          subject_style?: string
          tone?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      opportunities_raw: {
        Row: {
          acquisition_date: string | null
          created_at: string | null
          date_of_origination: string | null
          deal_name: string | null
          deal_source_company: string | null
          deal_source_contacts: string | null
          deal_source_individual_1: string | null
          deal_source_individual_2: string | null
          dealcloud: boolean | null
          ebitda: string | null
          ebitda_in_ms: number | null
          ebitda_notes: string | null
          est_deal_size: number | null
          est_lg_equity_invest: number | null
          funds: string | null
          headquarters: string | null
          id: string
          investment_professional_point_person_1: string | null
          investment_professional_point_person_2: string | null
          investment_professional_point_person_3: string | null
          investment_professional_point_person_4: string | null
          last_modified: string | null
          lg_focus_area: string | null
          lg_team: string | null
          most_recent_notes: string | null
          next_steps: string | null
          next_steps_due_date: string | null
          ownership: string | null
          ownership_type: string | null
          platform_add_on: string | null
          "Process Timeline": string | null
          process_timeline: string | null
          revenue: number | null
          sector: string | null
          status: string | null
          summary_of_opportunity: string | null
          tier: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          acquisition_date?: string | null
          created_at?: string | null
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_contacts?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          dealcloud?: boolean | null
          ebitda?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          est_deal_size?: number | null
          est_lg_equity_invest?: number | null
          funds?: string | null
          headquarters?: string | null
          id?: string
          investment_professional_point_person_1?: string | null
          investment_professional_point_person_2?: string | null
          investment_professional_point_person_3?: string | null
          investment_professional_point_person_4?: string | null
          last_modified?: string | null
          lg_focus_area?: string | null
          lg_team?: string | null
          most_recent_notes?: string | null
          next_steps?: string | null
          next_steps_due_date?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          "Process Timeline"?: string | null
          process_timeline?: string | null
          revenue?: number | null
          sector?: string | null
          status?: string | null
          summary_of_opportunity?: string | null
          tier?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          acquisition_date?: string | null
          created_at?: string | null
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_contacts?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          dealcloud?: boolean | null
          ebitda?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          est_deal_size?: number | null
          est_lg_equity_invest?: number | null
          funds?: string | null
          headquarters?: string | null
          id?: string
          investment_professional_point_person_1?: string | null
          investment_professional_point_person_2?: string | null
          investment_professional_point_person_3?: string | null
          investment_professional_point_person_4?: string | null
          last_modified?: string | null
          lg_focus_area?: string | null
          lg_team?: string | null
          most_recent_notes?: string | null
          next_steps?: string | null
          next_steps_due_date?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          "Process Timeline"?: string | null
          process_timeline?: string | null
          revenue?: number | null
          sector?: string | null
          status?: string | null
          summary_of_opportunity?: string | null
          tier?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      opportunities_raw_backup_2025_09_04: {
        Row: {
          created_at: string | null
          date_of_origination: string | null
          deal_name: string | null
          deal_source_company: string | null
          deal_source_individual_1: string | null
          deal_source_individual_2: string | null
          dealcloud: boolean | null
          ebitda: string | null
          ebitda_in_ms: number | null
          ebitda_notes: string | null
          id: string | null
          investment_professional_point_person_1: string | null
          investment_professional_point_person_2: string | null
          lg_focus_area: string | null
          most_recent_notes: string | null
          next_steps: string | null
          ownership: string | null
          ownership_type: string | null
          platform_add_on: string | null
          sector: string | null
          status: string | null
          summary_of_opportunity: string | null
          tier: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          dealcloud?: boolean | null
          ebitda?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          id?: string | null
          investment_professional_point_person_1?: string | null
          investment_professional_point_person_2?: string | null
          lg_focus_area?: string | null
          most_recent_notes?: string | null
          next_steps?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
          summary_of_opportunity?: string | null
          tier?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          dealcloud?: boolean | null
          ebitda?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          id?: string | null
          investment_professional_point_person_1?: string | null
          investment_professional_point_person_2?: string | null
          lg_focus_area?: string | null
          most_recent_notes?: string | null
          next_steps?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
          summary_of_opportunity?: string | null
          tier?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      opportunity_note_events: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          due_date: string | null
          field: string
          id: string
          opportunity_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          field: string
          id?: string
          opportunity_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          field?: string
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "kpi_opps_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_ai"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_email_payload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_raw"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opps_date_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      phrase_library: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_global: boolean | null
          phrase_text: string
          sync_behavior: string | null
          template_id: string | null
          tri_state: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          phrase_text: string
          sync_behavior?: string | null
          template_id?: string | null
          tri_state?: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          phrase_text?: string
          sync_behavior?: string | null
          template_id?: string | null
          tri_state?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phrase_library_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      phrase_rotation_log: {
        Row: {
          contact_id: string | null
          email_type: string | null
          id: string
          phrase_id: string | null
          used_at: string | null
        }
        Insert: {
          contact_id?: string | null
          email_type?: string | null
          id?: string
          phrase_id?: string | null
          used_at?: string | null
        }
        Update: {
          contact_id?: string | null
          email_type?: string | null
          id?: string
          phrase_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_ai"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_computed"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_raw"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_with_dynamic_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_with_opportunities_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "tom_new_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_contact_email_composer"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_contact_lag"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_contact_top_opps"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "phrase_rotation_log_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrase_library"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_library: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_global: boolean
          signature_text: string
          template_id: string | null
          tone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_global?: boolean
          signature_text: string
          template_id?: string | null
          tone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_global?: boolean
          signature_text?: string
          template_id?: string | null
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_library_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_library: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          style: string
          subject_template: string
          sync_behavior: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          style: string
          subject_template: string
          sync_behavior?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          style?: string
          subject_template?: string
          sync_behavior?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_library_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contact_inbox_candidates: {
        Row: {
          email: string | null
          interactions_count: number | null
          last_seen_at: string | null
          last_subject: string | null
          name_guess: string | null
          org_guess: string | null
        }
        Relationships: []
      }
      contact_notes_timeline: {
        Row: {
          contact_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          field: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          field?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          field?: string | null
        }
        Relationships: []
      }
      contacts_ai: {
        Row: {
          areas_of_specialization: string | null
          contact_id: string | null
          email: string | null
          emails_count: number | null
          focus_area: string | null
          focus_area_list: string | null
          full_name: string | null
          meetings_count: number | null
          most_recent_contact: string | null
          notes: string | null
          organization: string | null
          sector: string | null
          title: string | null
        }
        Relationships: []
      }
      contacts_app: {
        Row: {
          areas_of_specialization: string | null
          category: string | null
          contact_type: string | null
          created_at: string | null
          days_since_last_email: number | null
          days_since_last_meeting: number | null
          delta: number | null
          delta_type: string | null
          email_address: string | null
          email_subject: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          latest_contact_email: string | null
          latest_contact_meeting: string | null
          lg_focus_area_1: string | null
          lg_focus_area_2: string | null
          lg_focus_area_3: string | null
          lg_focus_area_4: string | null
          lg_focus_area_5: string | null
          lg_focus_area_6: string | null
          lg_focus_area_7: string | null
          lg_focus_area_8: string | null
          lg_focus_areas_comprehensive_list: string | null
          lg_sector: string | null
          meeting_title: string | null
          most_recent_contact: string | null
          notes: string | null
          of_emails: number | null
          of_meetings: number | null
          organization: string | null
          phone: string | null
          title: string | null
          total_of_contacts: number | null
          updated_at: string | null
          url_to_online_bio: string | null
        }
        Relationships: []
      }
      contacts_computed: {
        Row: {
          contact_id: string | null
          contact_type: string | null
          days_since_last_email: number | null
          days_since_last_meeting: number | null
          email_cc: string | null
          email_from: string | null
          email_subject: string | null
          email_to: string | null
          latest_contact_email: string | null
          latest_contact_meeting: string | null
          meeting_cc: string | null
          meeting_from: string | null
          meeting_title: string | null
          meeting_to: string | null
          most_recent_contact: string | null
          of_emails: number | null
          of_meetings: number | null
          total_of_contacts: number | null
        }
        Relationships: []
      }
      contacts_name_email: {
        Row: {
          email_address: string | null
          full_name: string | null
        }
        Relationships: []
      }
      contacts_norm: {
        Row: {
          areas_of_specialization: string | null
          delta: number | null
          delta_type: string | null
          email_lc: string | null
          full_name: string | null
          id: string | null
          lg_focus_areas_comprehensive_list: string | null
          lg_sector: string | null
          most_recent_contact: string | null
          norm_full_name: string | null
          notes: string | null
          organization: string | null
          title: string | null
        }
        Insert: {
          areas_of_specialization?: string | null
          delta?: number | null
          delta_type?: string | null
          email_lc?: never
          full_name?: string | null
          id?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_sector?: string | null
          most_recent_contact?: string | null
          norm_full_name?: never
          notes?: string | null
          organization?: string | null
          title?: string | null
        }
        Update: {
          areas_of_specialization?: string | null
          delta?: number | null
          delta_type?: string | null
          email_lc?: never
          full_name?: string | null
          id?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_sector?: string | null
          most_recent_contact?: string | null
          norm_full_name?: never
          notes?: string | null
          organization?: string | null
          title?: string | null
        }
        Relationships: []
      }
      contacts_with_dynamic_interactions: {
        Row: {
          all_emails: string | null
          all_opps: number | null
          areas_of_specialization: string | null
          category: string | null
          city: string | null
          contact_type: string | null
          created_at: string | null
          days_since_last_email: number | null
          days_since_last_meeting: number | null
          delta: number | null
          delta_type: string | null
          email_address: string | null
          email_cc: string | null
          email_from: string | null
          email_subject: string | null
          email_to: string | null
          first_name: string | null
          full_name: string | null
          group_contact: string | null
          id: string | null
          intentional_no_outreach: boolean | null
          intentional_no_outreach_date: string | null
          intentional_no_outreach_note: string | null
          last_name: string | null
          latest_contact_email: string | null
          latest_contact_meeting: string | null
          lg_assistant: string | null
          lg_focus_area_1: string | null
          lg_focus_area_2: string | null
          lg_focus_area_3: string | null
          lg_focus_area_4: string | null
          lg_focus_area_5: string | null
          lg_focus_area_6: string | null
          lg_focus_area_7: string | null
          lg_focus_area_8: string | null
          lg_focus_areas_comprehensive_list: string | null
          lg_lead: string | null
          lg_sector: string | null
          linkedin_url: string | null
          meeting_cc: string | null
          meeting_from: string | null
          meeting_title: string | null
          meeting_to: string | null
          most_recent_contact: string | null
          no_of_lg_focus_areas: number | null
          no_of_opps_sourced: number | null
          notes: string | null
          of_emails: number | null
          of_meetings: number | null
          organization: string | null
          outreach_date: string | null
          phone: string | null
          state: string | null
          title: string | null
          total_of_contacts: number | null
          updated_at: string | null
          url_to_online_bio: string | null
          x_twitter_url: string | null
        }
        Insert: {
          all_emails?: string | null
          all_opps?: number | null
          areas_of_specialization?: string | null
          category?: string | null
          city?: string | null
          contact_type?: string | null
          created_at?: string | null
          days_since_last_email?: number | null
          days_since_last_meeting?: number | null
          delta?: number | null
          delta_type?: string | null
          email_address?: string | null
          email_cc?: string | null
          email_from?: string | null
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          group_contact?: string | null
          id?: string | null
          intentional_no_outreach?: boolean | null
          intentional_no_outreach_date?: string | null
          intentional_no_outreach_note?: string | null
          last_name?: string | null
          latest_contact_email?: never
          latest_contact_meeting?: never
          lg_assistant?: string | null
          lg_focus_area_1?: string | null
          lg_focus_area_2?: string | null
          lg_focus_area_3?: string | null
          lg_focus_area_4?: string | null
          lg_focus_area_5?: string | null
          lg_focus_area_6?: string | null
          lg_focus_area_7?: string | null
          lg_focus_area_8?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_lead?: string | null
          lg_sector?: string | null
          linkedin_url?: string | null
          meeting_cc?: string | null
          meeting_from?: string | null
          meeting_title?: string | null
          meeting_to?: string | null
          most_recent_contact?: never
          no_of_lg_focus_areas?: number | null
          no_of_opps_sourced?: number | null
          notes?: string | null
          of_emails?: number | null
          of_meetings?: number | null
          organization?: string | null
          outreach_date?: string | null
          phone?: string | null
          state?: string | null
          title?: string | null
          total_of_contacts?: number | null
          updated_at?: string | null
          url_to_online_bio?: string | null
          x_twitter_url?: string | null
        }
        Update: {
          all_emails?: string | null
          all_opps?: number | null
          areas_of_specialization?: string | null
          category?: string | null
          city?: string | null
          contact_type?: string | null
          created_at?: string | null
          days_since_last_email?: number | null
          days_since_last_meeting?: number | null
          delta?: number | null
          delta_type?: string | null
          email_address?: string | null
          email_cc?: string | null
          email_from?: string | null
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          group_contact?: string | null
          id?: string | null
          intentional_no_outreach?: boolean | null
          intentional_no_outreach_date?: string | null
          intentional_no_outreach_note?: string | null
          last_name?: string | null
          latest_contact_email?: never
          latest_contact_meeting?: never
          lg_assistant?: string | null
          lg_focus_area_1?: string | null
          lg_focus_area_2?: string | null
          lg_focus_area_3?: string | null
          lg_focus_area_4?: string | null
          lg_focus_area_5?: string | null
          lg_focus_area_6?: string | null
          lg_focus_area_7?: string | null
          lg_focus_area_8?: string | null
          lg_focus_areas_comprehensive_list?: string | null
          lg_lead?: string | null
          lg_sector?: string | null
          linkedin_url?: string | null
          meeting_cc?: string | null
          meeting_from?: string | null
          meeting_title?: string | null
          meeting_to?: string | null
          most_recent_contact?: never
          no_of_lg_focus_areas?: number | null
          no_of_opps_sourced?: number | null
          notes?: string | null
          of_emails?: number | null
          of_meetings?: number | null
          organization?: string | null
          outreach_date?: string | null
          phone?: string | null
          state?: string | null
          title?: string | null
          total_of_contacts?: number | null
          updated_at?: string | null
          url_to_online_bio?: string | null
          x_twitter_url?: string | null
        }
        Relationships: []
      }
      contacts_with_opportunities_v: {
        Row: {
          email_address: string | null
          full_name: string | null
          id: string | null
          opportunities: string | null
        }
        Relationships: []
      }
      focus_area_options_v: {
        Row: {
          focus_area: string | null
          sector_guess: string | null
        }
        Relationships: []
      }
      interactions_ai: {
        Row: {
          email: string | null
          id: string | null
          occurred_at: string | null
          source: string | null
          subject: string | null
        }
        Relationships: []
      }
      interactions_app: {
        Row: {
          all_emails: string | null
          cc_emails: string | null
          cc_names: string | null
          created_at: string | null
          from_email: string | null
          from_name: string | null
          id: string | null
          occurred_at: string | null
          organization: string | null
          source: string | null
          subject: string | null
          to_emails: string | null
          to_names: string | null
          updated_at: string | null
        }
        Insert: {
          all_emails?: string | null
          cc_emails?: string | null
          cc_names?: string | null
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string | null
          occurred_at?: string | null
          organization?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          to_names?: string | null
          updated_at?: string | null
        }
        Update: {
          all_emails?: string | null
          cc_emails?: string | null
          cc_names?: string | null
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string | null
          occurred_at?: string | null
          organization?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          to_names?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      interactions_clean: {
        Row: {
          all_emails: string | null
          cc_emails: string | null
          emails_arr: string[] | null
          from_email: string | null
          from_name: string | null
          id: string | null
          occurred_at: string | null
          quarter_text: string | null
          source: string | null
          subject: string | null
          to_emails: string | null
          year_text: string | null
        }
        Insert: {
          all_emails?: string | null
          cc_emails?: string | null
          emails_arr?: string[] | null
          from_email?: string | null
          from_name?: string | null
          id?: string | null
          occurred_at?: string | null
          quarter_text?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          year_text?: string | null
        }
        Update: {
          all_emails?: string | null
          cc_emails?: string | null
          emails_arr?: string[] | null
          from_email?: string | null
          from_name?: string | null
          id?: string | null
          occurred_at?: string | null
          quarter_text?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          year_text?: string | null
        }
        Relationships: []
      }
      interactions_flat: {
        Row: {
          cc_emails: string | null
          email: string | null
          from_email: string | null
          id: string | null
          occurred_at: string | null
          source: string | null
          subject: string | null
          to_emails: string | null
        }
        Relationships: []
      }
      interactions_norm: {
        Row: {
          cc_emails_lc: string | null
          email_lc: string | null
          from_email_lc: string | null
          id: string | null
          occurred_at: string | null
          source: string | null
          subject: string | null
          to_emails_lc: string | null
        }
        Relationships: []
      }
      interactions_parsed: {
        Row: {
          cc_emails: string | null
          created_at: string | null
          emails_arr: string[] | null
          from_email: string | null
          from_name: string | null
          id: string | null
          occurred_at: string | null
          organization: string | null
          source: string | null
          subject: string | null
          to_emails: string | null
          updated_at: string | null
        }
        Insert: {
          cc_emails?: string | null
          created_at?: string | null
          emails_arr?: string[] | null
          from_email?: never
          from_name?: string | null
          id?: string | null
          occurred_at?: string | null
          organization?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          updated_at?: string | null
        }
        Update: {
          cc_emails?: string | null
          created_at?: string | null
          emails_arr?: string[] | null
          from_email?: never
          from_name?: string | null
          id?: string | null
          occurred_at?: string | null
          organization?: string | null
          source?: string | null
          subject?: string | null
          to_emails?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kpi_contacts_headline: {
        Row: {
          meetings_last_90d: number | null
          total_contacts: number | null
        }
        Relationships: []
      }
      kpi_lg_leads: {
        Row: {
          email: string | null
          last_name: string | null
          name: string | null
        }
        Relationships: []
      }
      kpi_meetings_monthly: {
        Row: {
          meeting_count: number | null
          month_start: string | null
        }
        Relationships: []
      }
      kpi_opps_base: {
        Row: {
          date_of_origination_raw: string | null
          deal_name: string | null
          ebitda_m: number | null
          id: string | null
          ip1: string | null
          ip2: string | null
          is_addon: boolean | null
          is_family_founder: boolean | null
          is_platform: boolean | null
          lg_focus_area: string | null
          ownership_type: string | null
          platform_add_on: string | null
          referral_company: string | null
          referral_contact_1: string | null
          referral_contact_2: string | null
          sector: string | null
          status: string | null
          tier: string | null
        }
        Insert: {
          date_of_origination_raw?: never
          deal_name?: never
          ebitda_m?: number | null
          id?: string | null
          ip1?: never
          ip2?: never
          is_addon?: never
          is_family_founder?: never
          is_platform?: never
          lg_focus_area?: never
          ownership_type?: never
          platform_add_on?: never
          referral_company?: never
          referral_contact_1?: never
          referral_contact_2?: never
          sector?: never
          status?: never
          tier?: never
        }
        Update: {
          date_of_origination_raw?: never
          deal_name?: never
          ebitda_m?: number | null
          id?: string | null
          ip1?: never
          ip2?: never
          is_addon?: never
          is_family_founder?: never
          is_platform?: never
          lg_focus_area?: never
          ownership_type?: never
          platform_add_on?: never
          referral_company?: never
          referral_contact_1?: never
          referral_contact_2?: never
          sector?: never
          status?: never
          tier?: never
        }
        Relationships: []
      }
      kpi_referral_companies: {
        Row: {
          opp_count: number | null
          referral_company_display: string | null
          referral_company_key: string | null
        }
        Relationships: []
      }
      kpi_referral_contacts: {
        Row: {
          opp_count: number | null
          referral_contact_display: string | null
          referral_contact_key: string | null
        }
        Relationships: []
      }
      one_on_one_meetings: {
        Row: {
          lead_email: string | null
          lead_name: string | null
          minutes: number | null
          occurred_at: string | null
        }
        Relationships: []
      }
      opportunities_ai: {
        Row: {
          date_of_origination_text: string | null
          deal_name: string | null
          deal_source_company: string | null
          deal_source_individual_1: string | null
          deal_source_individual_2: string | null
          ebitda_in_ms: number | null
          ebitda_notes: string | null
          ebitda_text: string | null
          focus_area: string | null
          lg_lead_1: string | null
          lg_lead_2: string | null
          opportunity_id: string | null
          ownership: string | null
          ownership_type: string | null
          platform_add_on: string | null
          sector: string | null
          status: string | null
        }
        Insert: {
          date_of_origination_text?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          ebitda_text?: string | null
          focus_area?: string | null
          lg_lead_1?: never
          lg_lead_2?: never
          opportunity_id?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
        }
        Update: {
          date_of_origination_text?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          ebitda_text?: string | null
          focus_area?: string | null
          lg_lead_1?: never
          lg_lead_2?: never
          opportunity_id?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
        }
        Relationships: []
      }
      opportunities_app: {
        Row: {
          created_at: string | null
          date_of_origination: string | null
          deal_name: string | null
          deal_source_company: string | null
          deal_source_individual_1: string | null
          deal_source_individual_2: string | null
          dealcloud: boolean | null
          ebitda: string | null
          ebitda_in_ms: number | null
          ebitda_notes: string | null
          id: string | null
          investment_professional_point_person_1: string | null
          investment_professional_point_person_2: string | null
          lg_focus_area: string | null
          most_recent_notes: string | null
          ownership: string | null
          ownership_type: string | null
          platform_add_on: string | null
          sector: string | null
          status: string | null
          summary_of_opportunity: string | null
          tier: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          dealcloud?: boolean | null
          ebitda?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          id?: string | null
          investment_professional_point_person_1?: string | null
          investment_professional_point_person_2?: string | null
          lg_focus_area?: string | null
          most_recent_notes?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
          summary_of_opportunity?: string | null
          tier?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          dealcloud?: boolean | null
          ebitda?: string | null
          ebitda_in_ms?: number | null
          ebitda_notes?: string | null
          id?: string | null
          investment_professional_point_person_1?: string | null
          investment_professional_point_person_2?: string | null
          lg_focus_area?: string | null
          most_recent_notes?: string | null
          ownership?: string | null
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
          summary_of_opportunity?: string | null
          tier?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      opportunities_email_payload: {
        Row: {
          created_at: string | null
          date_of_origination: string | null
          deal_name: string | null
          deal_source_company: string | null
          deal_source_individual_1: string | null
          deal_source_individual_1_email: string | null
          deal_source_individual_2: string | null
          deal_source_individual_2_email: string | null
          dealcloud: boolean | null
          ebitda: string | null
          ebitda_in_ms: number | null
          ebitda_notes: string | null
          id: string | null
          investment_professional_point_person_1: string | null
          investment_professional_point_person_2: string | null
          lg_focus_area: string | null
          lg_lead_1_email: string | null
          lg_lead_1_name: string | null
          lg_lead_2_email: string | null
          lg_lead_2_name: string | null
          lg_leads: string | null
          lg_leads_emails: string[] | null
          most_recent_notes: string | null
          next_steps: string | null
          ownership: string | null
          ownership_type: string | null
          platform_add_on: string | null
          sector: string | null
          status: string | null
          summary_of_opportunity: string | null
          tier: string | null
          updated_at: string | null
          url: string | null
        }
        Relationships: []
      }
      opportunities_norm: {
        Row: {
          date_of_origination: string | null
          deal_name: string | null
          deal_source_company: string | null
          deal_source_individual_1: string | null
          deal_source_individual_2: string | null
          ebitda: string | null
          id: string | null
          lg_focus_area: string | null
          norm_src_1: string | null
          norm_src_2: string | null
          ownership_type: string | null
          platform_add_on: string | null
          sector: string | null
          status: string | null
          tier: string | null
        }
        Insert: {
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          ebitda?: string | null
          id?: string | null
          lg_focus_area?: string | null
          norm_src_1?: never
          norm_src_2?: never
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
          tier?: string | null
        }
        Update: {
          date_of_origination?: string | null
          deal_name?: string | null
          deal_source_company?: string | null
          deal_source_individual_1?: string | null
          deal_source_individual_2?: string | null
          ebitda?: string | null
          id?: string | null
          lg_focus_area?: string | null
          norm_src_1?: never
          norm_src_2?: never
          ownership_type?: string | null
          platform_add_on?: string | null
          sector?: string | null
          status?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      opportunity_notes_timeline: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          field: string | null
          id: string | null
          opportunity_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          field?: string | null
          id?: string | null
          opportunity_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          field?: string | null
          id?: string | null
          opportunity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "kpi_opps_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_ai"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_email_payload"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_norm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_raw"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_note_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opps_date_norm"
            referencedColumns: ["id"]
          },
        ]
      }
      opps_date_norm: {
        Row: {
          date_of_origination: string | null
          id: string | null
          quarter: number | null
          year: number | null
          year_quarter: string | null
        }
        Relationships: []
      }
      opps_year_quarters: {
        Row: {
          year_quarter: string | null
        }
        Relationships: []
      }
      opps_years: {
        Row: {
          year: number | null
        }
        Relationships: []
      }
      tom_new_view: {
        Row: {
          areas_of_specialization: string | null
          contact_id: string | null
          deal_name: string | null
          deal_source_company: string | null
          deal_source_individual: string | null
          delta: number | null
          delta_days: number | null
          delta_type: string | null
          has_opps: string | null
          lg_focus_area: string | null
          lg_lead: string | null
          lg_sector: string | null
          most_recent_contact: string | null
          next_scheduled_outreach_date: string | null
          no_of_emails: number | null
          no_of_meetings: number | null
        }
        Relationships: []
      }
      ui_distinct_focus_areas: {
        Row: {
          focus_area: string | null
        }
        Relationships: []
      }
      ui_distinct_focus_areas_v: {
        Row: {
          focus_area: string | null
        }
        Relationships: []
      }
      ui_distinct_lg_sectors: {
        Row: {
          lg_sector: string | null
        }
        Relationships: []
      }
      v_contact_email_composer: {
        Row: {
          articles: Json | null
          assistant_emails: string[] | null
          assistant_names: string[] | null
          contact_id: string | null
          email: string | null
          fa_count: number | null
          fa_descriptions: Json | null
          fa_sectors: string[] | null
          first_name: string | null
          focus_areas: string[] | null
          full_name: string | null
          gb_present: boolean | null
          has_opps: boolean | null
          hs_present: boolean | null
          lead_emails: string[] | null
          lg_emails_cc: string | null
          ls_present: boolean | null
          most_recent_contact: string | null
          opps: Json | null
          organization: string | null
          outreach_date: string | null
        }
        Relationships: []
      }
      v_contact_lag: {
        Row: {
          contact_id: string | null
          email_address: string | null
          first_name: string | null
          full_name: string | null
          lag_days: number | null
          last_contact_date: string | null
          organization: string | null
          outreach_date: string | null
        }
        Insert: {
          contact_id?: string | null
          email_address?: string | null
          first_name?: string | null
          full_name?: string | null
          lag_days?: never
          last_contact_date?: never
          organization?: string | null
          outreach_date?: never
        }
        Update: {
          contact_id?: string | null
          email_address?: string | null
          first_name?: string | null
          full_name?: string | null
          lag_days?: never
          last_contact_date?: never
          organization?: string | null
          outreach_date?: never
        }
        Relationships: []
      }
      v_contact_top_opps: {
        Row: {
          contact_id: string | null
          deal_name: string | null
          ebitda_in_ms: number | null
          rn: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_contact_note: {
        Args: { p_contact_id: string; p_content: string; p_field: string }
        Returns: undefined
      }
      add_opportunity_note: {
        Args:
          | {
              p_content: string
              p_due_date?: string
              p_field: string
              p_opportunity_id: string
            }
          | { p_content: string; p_field: string; p_opportunity_id: string }
        Returns: undefined
      }
      adjust_weekend: {
        Args: { ts: string }
        Returns: string
      }
      api_tom_new_view: {
        Args: Record<PropertyKey, never>
        Returns: {
          areas_of_specialization: string
          deal_name: string
          deal_source_company: string
          deal_source_individual: string
          delta: number
          delta_type: string
          has_opps: string
          lg_focus_area: string
          lg_lead: string
          lg_sector: string
          most_recent_contact: string
          next_scheduled_outreach_date: string
          no_of_emails: number
          no_of_meetings: number
        }[]
      }
      approve_contact_candidate: {
        Args: { p_email: string; p_full_name?: string; p_organization?: string }
        Returns: string
      }
      approve_missing_contact: {
        Args: { p_email: string }
        Returns: string
      }
      avg_minutes_per_week_by_lead: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_minutes_per_week: number
          lead_name: string
        }[]
      }
      calculate_contact_leads_and_assistants: {
        Args: { p_focus_areas_list: string }
        Returns: {
          assistants: string
          leads: string
        }[]
      }
      canonical_focus_area: {
        Args: { input_text: string }
        Returns: string
      }
      compute_ebitda_range: {
        Args: { p_amount: number; p_notes: string }
        Returns: string
      }
      contacts_ids_by_opportunity_filters: {
        Args: {
          p_date_end?: string
          p_date_start?: string
          p_ebitda_max?: number
          p_ebitda_min?: number
          p_lg_lead?: string[]
          p_ownership_type?: string[]
          p_platform_add_on?: string[]
          p_status?: string[]
          p_tier?: string[]
        }
        Returns: {
          contact_id: string
        }[]
      }
      dismiss_contact_candidate: {
        Args: { p_email: string; p_note?: string }
        Returns: undefined
      }
      dismiss_missing_contact: {
        Args: { p_email: string }
        Returns: boolean
      }
      get_article_age_in_days: {
        Args: { added_date: string }
        Returns: number
      }
      get_contact_enriched: {
        Args: { contact_id: string; opp_limit?: number }
        Returns: Json
      }
      get_focus_meta: {
        Args: { focus_areas: string[] }
        Returns: {
          assistant_email: string
          assistant_name: string
          description: string
          focus_area: string
          lead1_email: string
          lead1_name: string
          lead2_email: string
          lead2_name: string
          sector_id: string
        }[]
      }
      get_latest_contact_email: {
        Args: { p_email: string }
        Returns: string
      }
      get_latest_contact_meeting: {
        Args: { p_email: string }
        Returns: string
      }
      get_most_recent_contact_dynamic: {
        Args: { p_email: string }
        Returns: string
      }
      get_opps_for_contact: {
        Args: { full_name: string; limit_n?: number }
        Returns: {
          deal_name: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      guess_name_from_email: {
        Args: { p_email: string }
        Returns: string
      }
      guess_org_from_email: {
        Args: { p_email: string }
        Returns: string
      }
      interactions_for_email_recent: {
        Args: { p_email: string; p_limit?: number }
        Returns: {
          cc_emails: string
          from_email: string
          id: string
          occurred_at: string
          source: string
          subject: string
          to_emails: string
        }[]
      }
      interactions_query: {
        Args: {
          p_channel?: string
          p_email?: string
          p_end?: string
          p_keyword?: string
          p_limit?: number
          p_offset?: number
          p_start?: string
        }
        Returns: {
          cc_emails: string
          from_email: string
          id: string
          occurred_at: string
          organization: string
          source: string
          subject: string
          to_emails: string
        }[]
      }
      is_valid_email: {
        Args: { p: string }
        Returns: boolean
      }
      kpi_default_meeting_min: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      kpi_header: {
        Args: {
          p_end: string
          p_focus_areas?: string[]
          p_leads?: string[]
          p_ownership?: string[]
          p_sector?: string[]
          p_start: string
        }
        Returns: {
          notable_opportunities: number
          total_contacts: number
          total_meetings: number
        }[]
      }
      kpi_leads_performance: {
        Args: {
          p_end: string
          p_focus_areas?: string[]
          p_sector?: string[]
          p_start: string
        }
        Returns: {
          avg_hours_per_week: number
          lg_lead: string
          opportunities: number
          top_opportunities: string
        }[]
      }
      kpi_lg_hours_and_opps: {
        Args: { p_default_meeting_min?: number; p_end: string; p_start: string }
        Returns: {
          avg_hours_per_week: number
          lg_lead: string
          opportunities: number
          top_opportunities: string
        }[]
      }
      kpi_meetings_monthly: {
        Args: {
          p_end: string
          p_focus_area?: string
          p_lg_lead_name?: string
          p_start: string
        }
        Returns: {
          count: number
          month: string
        }[]
      }
      kpi_meetings_per_month: {
        Args: {
          p_end: string
          p_focus_areas?: string[]
          p_sector?: string[]
          p_start: string
        }
        Returns: {
          meetings: number
          month_label: string
        }[]
      }
      kpi_summary: {
        Args: {
          p_ebitda_min?: number
          p_end: string
          p_family_owned_only?: boolean
          p_focus_area?: string
          p_lg_lead_name?: string
          p_start: string
        }
        Returns: {
          meetings_count: number
          notable_opportunities: number
          total_contacts: number
        }[]
      }
      last_interaction_for_email: {
        Args: { p_email: string }
        Returns: {
          cc_emails: string
          from_email: string
          id: string
          occurred_at: string
          source: string
          subject: string
          to_emails: string
        }[]
      }
      map_lg_lead_name: {
        Args: { input: string }
        Returns: string
      }
      normalize_focus_area: {
        Args: { input_text: string }
        Returns: string
      }
      normalize_name: {
        Args: { t: string }
        Returns: string
      }
      opportunities_aggregate: {
        Args: { p_end?: string; p_group_by: string; p_start?: string }
        Returns: {
          bucket: string
          count: number
        }[]
      }
      opportunities_query: {
        Args: {
          p_deal_source_name?: string
          p_limit?: number
          p_name_contains?: string
          p_offset?: number
          p_sector_in?: string[]
          p_status_in?: string[]
          p_tier_in?: string[]
        }
        Returns: {
          date_of_origination: string
          deal_name: string
          id: string
          lg_focus_area: string
          sector: string
          status: string
          tier: string
        }[]
      }
      refresh_all_contact_leads_assistants: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      refresh_missing_contacts: {
        Args: { p_exclude_domain?: string }
        Returns: number
      }
      reject_missing_contact: {
        Args: { p_email: string }
        Returns: undefined
      }
      set_intentional_no_outreach: {
        Args: { p_action_type?: string; p_contact_id: string; p_note?: string }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      util_quarter_text: {
        Args: { t: string }
        Returns: string
      }
      util_safe_timestamptz: {
        Args: { t: string }
        Returns: string
      }
      util_year_text: {
        Args: { t: string }
        Returns: string
      }
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
