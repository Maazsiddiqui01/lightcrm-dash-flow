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
      contacts_raw: {
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
          email_subject: string | null
          email_to: string | null
          first_name: string | null
          full_name: string | null
          id: string
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
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
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
          email_subject?: string | null
          email_to?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
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
          title?: string | null
          total_of_contacts?: number | null
          updated_at?: string | null
          url_to_online_bio?: string | null
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
      lg_leads_directory: {
        Row: {
          email: string
          lead_name: string
        }
        Insert: {
          email: string
          lead_name: string
        }
        Update: {
          email?: string
          lead_name?: string
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
          id: string
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
          id?: string
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
          id?: string
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
    }
    Views: {
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
      tom_new_view_mat: {
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
    }
    Functions: {
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
      kpi_lg_hours_and_opps: {
        Args: { p_default_meeting_min?: number; p_end: string; p_start: string }
        Returns: {
          avg_hours_per_week: number
          lg_lead: string
          opportunities: string
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
