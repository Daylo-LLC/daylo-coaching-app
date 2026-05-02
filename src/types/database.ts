export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      availability: {
        Row: {
          coach_id: string;
          created_at: string;
          date: string;
          home_away_preference: string;
          id: string;
          is_booked: boolean;
          is_recurring: boolean;
          max_travel_distance_miles: number | null;
          recurrence_rule: string | null;
          school_id: string;
          sport: string;
          time_end: string;
          time_start: string;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          coach_id: string;
          created_at?: string;
          date: string;
          home_away_preference?: string;
          id?: string;
          is_booked?: boolean;
          is_recurring?: boolean;
          max_travel_distance_miles?: number | null;
          recurrence_rule?: string | null;
          school_id: string;
          sport: string;
          time_end: string;
          time_start: string;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          coach_id?: string;
          created_at?: string;
          date?: string;
          home_away_preference?: string;
          id?: string;
          is_booked?: boolean;
          is_recurring?: boolean;
          max_travel_distance_miles?: number | null;
          recurrence_rule?: string | null;
          school_id?: string;
          sport?: string;
          time_end?: string;
          time_start?: string;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "availability_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_schools: {
        Row: {
          coach_id: string;
          created_at: string;
          id: string;
          is_primary: boolean;
          school_id: string;
          sport: string;
        };
        Insert: {
          coach_id: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          school_id: string;
          sport: string;
        };
        Update: {
          coach_id?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          school_id?: string;
          sport?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_schools_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coach_schools_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          participant_a: string;
          participant_b: string;
          request_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          participant_a: string;
          participant_b: string;
          request_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          participant_a?: string;
          participant_b?: string;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_participant_a_fkey";
            columns: ["participant_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_b_fkey";
            columns: ["participant_b"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string;
          file_name: string | null;
          file_size_bytes: number | null;
          file_type: string | null;
          file_url: string | null;
          id: string;
          is_read: boolean;
          sender_id: string;
        };
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          is_read?: boolean;
          sender_id: string;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          is_read?: boolean;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          approval_status: string;
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          first_name: string | null;
          id: string;
          is_admin: boolean;
          is_approved: boolean;
          last_name: string | null;
          notify_new_message: boolean;
          notify_new_request: boolean;
          notify_request_status: boolean;
          notify_schedule_update: boolean;
          phone: string | null;
          push_token: string | null;
          school_id: string | null;
          updated_at: string;
        };
        Insert: {
          approval_status?: string;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          id: string;
          is_admin?: boolean;
          is_approved?: boolean;
          last_name?: string | null;
          notify_new_message?: boolean;
          notify_new_request?: boolean;
          notify_request_status?: boolean;
          notify_schedule_update?: boolean;
          phone?: string | null;
          push_token?: string | null;
          school_id?: string | null;
          updated_at?: string;
        };
        Update: {
          approval_status?: string;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          is_admin?: boolean;
          is_approved?: boolean;
          last_name?: string | null;
          notify_new_message?: boolean;
          notify_new_request?: boolean;
          notify_request_status?: boolean;
          notify_schedule_update?: boolean;
          phone?: string | null;
          push_token?: string | null;
          school_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          id: string;
          reason: string;
          reported_message_id: string | null;
          reported_user_id: string | null;
          reporter_id: string;
          resolved_by: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          id?: string;
          reason: string;
          reported_message_id?: string | null;
          reported_user_id?: string | null;
          reporter_id: string;
          resolved_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          id?: string;
          reason?: string;
          reported_message_id?: string | null;
          reported_user_id?: string | null;
          reporter_id?: string;
          resolved_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reported_message_id_fkey";
            columns: ["reported_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      requests: {
        Row: {
          availability_id: string | null;
          counter_proposal: Json | null;
          created_at: string;
          date: string;
          home_away: string;
          id: string;
          parent_request_id: string | null;
          recipient_id: string;
          recipient_school_id: string;
          requester_id: string;
          requester_school_id: string;
          sport: string;
          status: string;
          time_end: string;
          time_start: string;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          availability_id?: string | null;
          counter_proposal?: Json | null;
          created_at?: string;
          date: string;
          home_away: string;
          id?: string;
          parent_request_id?: string | null;
          recipient_id: string;
          recipient_school_id: string;
          requester_id: string;
          requester_school_id: string;
          sport: string;
          status?: string;
          time_end: string;
          time_start: string;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          availability_id?: string | null;
          counter_proposal?: Json | null;
          created_at?: string;
          date?: string;
          home_away?: string;
          id?: string;
          parent_request_id?: string | null;
          recipient_id?: string;
          recipient_school_id?: string;
          requester_id?: string;
          requester_school_id?: string;
          sport?: string;
          status?: string;
          time_end?: string;
          time_start?: string;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "requests_availability_id_fkey";
            columns: ["availability_id"];
            isOneToOne: false;
            referencedRelation: "availability";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requests_parent_request_id_fkey";
            columns: ["parent_request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requests_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requests_recipient_school_id_fkey";
            columns: ["recipient_school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requests_requester_school_id_fkey";
            columns: ["requester_school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      school_change_requests: {
        Row: {
          coach_id: string;
          created_at: string;
          current_school_id: string;
          id: string;
          reason: string | null;
          requested_school_id: string;
          reviewed_by: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          created_at?: string;
          current_school_id: string;
          id?: string;
          reason?: string | null;
          requested_school_id: string;
          reviewed_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          coach_id?: string;
          created_at?: string;
          current_school_id?: string;
          id?: string;
          reason?: string | null;
          requested_school_id?: string;
          reviewed_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_change_requests_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "school_change_requests_current_school_id_fkey";
            columns: ["current_school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "school_change_requests_requested_school_id_fkey";
            columns: ["requested_school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "school_change_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          address: string | null;
          city: string | null;
          conference: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          county: string | null;
          created_at: string;
          created_by: string | null;
          district: string | null;
          division: string | null;
          id: string;
          location: unknown;
          logo_url: string | null;
          mascot: string | null;
          name: string;
          state: string | null;
          updated_at: string;
          zip_code: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          conference?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          county?: string | null;
          created_at?: string;
          created_by?: string | null;
          district?: string | null;
          division?: string | null;
          id?: string;
          location?: unknown;
          logo_url?: string | null;
          mascot?: string | null;
          name: string;
          state?: string | null;
          updated_at?: string;
          zip_code?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          conference?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          county?: string | null;
          created_at?: string;
          created_by?: string | null;
          district?: string | null;
          division?: string | null;
          id?: string;
          location?: unknown;
          logo_url?: string | null;
          mascot?: string | null;
          name?: string;
          state?: string | null;
          updated_at?: string;
          zip_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schools_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      is_approved: { Args: never; Returns: boolean };
      search_schools_within_radius: {
        Args: {
          filter_conference?: string;
          filter_division?: string;
          filter_sport?: string;
          lat: number;
          lng: number;
          radius_miles: number;
        };
        Returns: {
          address: string | null;
          city: string | null;
          conference: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          division: string | null;
          id: string;
          location: unknown;
          logo_url: string | null;
          mascot: string | null;
          name: string;
          state: string | null;
          updated_at: string;
          zip_code: string | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
