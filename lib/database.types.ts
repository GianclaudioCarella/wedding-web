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
      api_logs: {
        Row: {
          api_name: string;
          endpoint: string | null;
          error_message: string | null;
          error_type: string | null;
          id: string;
          metadata: Json | null;
          method: string | null;
          response_time_ms: number | null;
          session_id: string | null;
          status_code: number | null;
          success: boolean | null;
          timestamp: string | null;
          user_id: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          api_name: string;
          endpoint?: string | null;
          error_message?: string | null;
          error_type?: string | null;
          id?: string;
          metadata?: Json | null;
          method?: string | null;
          response_time_ms?: number | null;
          session_id?: string | null;
          status_code?: number | null;
          success?: boolean | null;
          timestamp?: string | null;
          user_id?: string | null;
          wedding_id: string;
        };
        Update: {
          api_name?: string;
          endpoint?: string | null;
          error_message?: string | null;
          error_type?: string | null;
          id?: string;
          metadata?: Json | null;
          method?: string | null;
          response_time_ms?: number | null;
          session_id?: string | null;
          status_code?: number | null;
          success?: boolean | null;
          timestamp?: string | null;
          user_id?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_logs_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_conversations: {
        Row: {
          created_at: string | null;
          id: string;
          title: string;
          updated_at: string | null;
          user_id: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          title: string;
          updated_at?: string | null;
          user_id: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_conversations_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string | null;
          id: string;
          role: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          role: string;
          wedding_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          role?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "chat_conversations";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "chat_messages_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: string;
          updated_at: string | null;
          updated_by: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: string;
          updated_at?: string | null;
          updated_by?: string | null;
          wedding_id: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_settings_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_items: {
        Row: {
          checklist_id: string;
          completed: boolean;
          created_at: string;
          id: string;
          notes: string;
          position: number;
          title: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          checklist_id: string;
          completed?: boolean;
          created_at?: string;
          id?: string;
          notes?: string;
          position?: number;
          title: string;
          wedding_id: string;
        };
        Update: {
          checklist_id?: string;
          completed?: boolean;
          created_at?: string;
          id?: string;
          notes?: string;
          position?: number;
          title?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey";
            columns: ["checklist_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "checklists";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "checklist_items_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      checklists: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklists_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_summaries: {
        Row: {
          conversation_id: string;
          created_at: string | null;
          id: string;
          importance_score: number | null;
          key_topics: string[] | null;
          message_count: number;
          summary: string;
          user_id: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          importance_score?: number | null;
          key_topics?: string[] | null;
          message_count: number;
          summary: string;
          user_id: string;
          wedding_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          importance_score?: number | null;
          key_topics?: string[] | null;
          message_count?: number;
          summary?: string;
          user_id?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey";
            columns: ["conversation_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "chat_conversations";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "conversation_summaries_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string | null;
          document_id: string;
          embedding: string | null;
          id: string;
          metadata: Json | null;
          token_count: number | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string | null;
          document_id: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          token_count?: number | null;
          wedding_id: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string | null;
          document_id?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          token_count?: number | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey";
            columns: ["document_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "document_chunks_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          error_message: string | null;
          file_size: number;
          file_type: string;
          filename: string;
          id: string;
          metadata: Json | null;
          status: string;
          uploaded_at: string | null;
          uploaded_by: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          error_message?: string | null;
          file_size: number;
          file_type: string;
          filename: string;
          id?: string;
          metadata?: Json | null;
          status?: string;
          uploaded_at?: string | null;
          uploaded_by: string;
          wedding_id: string;
        };
        Update: {
          error_message?: string | null;
          file_size?: number;
          file_type?: string;
          filename?: string;
          id?: string;
          metadata?: Json | null;
          status?: string;
          uploaded_at?: string | null;
          uploaded_by?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      email_campaigns: {
        Row: {
          body: string;
          failed_count: number;
          id: string;
          recipient_count: number;
          recipient_filter: string;
          recipient_names: string | null;
          sent_at: string | null;
          sent_by: string | null;
          subject: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          failed_count?: number;
          id?: string;
          recipient_count?: number;
          recipient_filter?: string;
          recipient_names?: string | null;
          sent_at?: string | null;
          sent_by?: string | null;
          subject: string;
          wedding_id: string;
        };
        Update: {
          body?: string;
          failed_count?: number;
          id?: string;
          recipient_count?: number;
          recipient_filter?: string;
          recipient_names?: string | null;
          sent_at?: string | null;
          sent_by?: string | null;
          subject?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_campaigns_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      event_guests: {
        Row: {
          created_at: string | null;
          event_id: string;
          guest_id: string;
          id: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          event_id: string;
          guest_id: string;
          id?: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          guest_id?: string;
          id?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_guests_event_id_fkey";
            columns: ["event_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "event_guests_guest_id_fkey";
            columns: ["guest_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "event_guests_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string | null;
          description: Json | null;
          event_date: string;
          event_time: string | null;
          id: string;
          location: string | null;
          name: NonNullable<Json>;
          slug: string | null;
          sort_order: number | null;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          description?: Json | null;
          event_date: string;
          event_time?: string | null;
          id?: string;
          location?: string | null;
          name?: NonNullable<Json>;
          slug?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: Json | null;
          event_date?: string;
          event_time?: string | null;
          id?: string;
          location?: string | null;
          name?: NonNullable<Json>;
          slug?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      external_accommodations: {
        Row: {
          created_at: string | null;
          description: Json | null;
          directions_url: string | null;
          distance_from_venue: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean | null;
          name: string;
          price_range: string | null;
          sort_order: number | null;
          updated_at: string | null;
          url: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          description?: Json | null;
          directions_url?: string | null;
          distance_from_venue?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          name: string;
          price_range?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          url?: string | null;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: Json | null;
          directions_url?: string | null;
          distance_from_venue?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          name?: string;
          price_range?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          url?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "external_accommodations_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      faq_items: {
        Row: {
          answer: Json | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          question: NonNullable<Json>;
          sort_order: number | null;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          answer?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          question?: NonNullable<Json>;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          answer?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          question?: NonNullable<Json>;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faq_items_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_events: {
        Row: {
          created_at: string | null;
          event_id: string;
          guest_id: string;
          id: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          event_id: string;
          guest_id: string;
          id?: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          guest_id?: string;
          id?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_events_event_id_fkey";
            columns: ["event_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "guest_events_guest_id_fkey";
            columns: ["guest_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "guest_events_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_room_assignments: {
        Row: {
          bed_label: string | null;
          created_at: string | null;
          guest_id: string;
          id: string;
          notes: string | null;
          room_id: string;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          bed_label?: string | null;
          created_at?: string | null;
          guest_id: string;
          id?: string;
          notes?: string | null;
          room_id: string;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          bed_label?: string | null;
          created_at?: string | null;
          guest_id?: string;
          id?: string;
          notes?: string | null;
          room_id?: string;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_room_assignments_guest_id_fkey";
            columns: ["guest_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "guest_room_assignments_room_id_fkey";
            columns: ["room_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "venue_rooms";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "guest_room_assignments_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_stay_requests: {
        Row: {
          friday_night: boolean | null;
          guest_id: string;
          id: string;
          notes: string | null;
          saturday_night: boolean | null;
          sunday_night: boolean | null;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          friday_night?: boolean | null;
          guest_id: string;
          id?: string;
          notes?: string | null;
          saturday_night?: boolean | null;
          sunday_night?: boolean | null;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          friday_night?: boolean | null;
          guest_id?: string;
          id?: string;
          notes?: string | null;
          saturday_night?: boolean | null;
          sunday_night?: boolean | null;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_stay_requests_guest_id_fkey";
            columns: ["guest_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "guest_stay_requests_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_transport: {
        Row: {
          created_at: string | null;
          guest_id: string;
          id: string;
          transport_option_id: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          guest_id: string;
          id?: string;
          transport_option_id: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          guest_id?: string;
          id?: string;
          transport_option_id?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_transport_guest_id_fkey";
            columns: ["guest_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "guest_transport_transport_option_id_fkey";
            columns: ["transport_option_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "transport_options";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "guest_transport_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      guests: {
        Row: {
          address: string | null;
          attending: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          invite_token: string | null;
          invited_at: string | null;
          language: string | null;
          name: string;
          notes: string | null;
          party_leader_id: string | null;
          party_role: string | null;
          phone: string | null;
          plus_one_email: string | null;
          plus_one_name: string | null;
          save_the_date_notes: string | null;
          save_the_date_sent: boolean | null;
          tags: string[] | null;
          total_guests: number;
          transport_from: string | null;
          transport_needed: boolean | null;
          transport_return: boolean | null;
          updated_at: string | null;
          venue_stay_invited: boolean | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          attending?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          invite_token?: string | null;
          invited_at?: string | null;
          language?: string | null;
          name: string;
          notes?: string | null;
          party_leader_id?: string | null;
          party_role?: string | null;
          phone?: string | null;
          plus_one_email?: string | null;
          plus_one_name?: string | null;
          save_the_date_notes?: string | null;
          save_the_date_sent?: boolean | null;
          tags?: string[] | null;
          total_guests?: number;
          transport_from?: string | null;
          transport_needed?: boolean | null;
          transport_return?: boolean | null;
          updated_at?: string | null;
          venue_stay_invited?: boolean | null;
          wedding_id: string;
        };
        Update: {
          address?: string | null;
          attending?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          invite_token?: string | null;
          invited_at?: string | null;
          language?: string | null;
          name?: string;
          notes?: string | null;
          party_leader_id?: string | null;
          party_role?: string | null;
          phone?: string | null;
          plus_one_email?: string | null;
          plus_one_name?: string | null;
          save_the_date_notes?: string | null;
          save_the_date_sent?: boolean | null;
          tags?: string[] | null;
          total_guests?: number;
          transport_from?: string | null;
          transport_needed?: boolean | null;
          transport_return?: boolean | null;
          updated_at?: string | null;
          venue_stay_invited?: boolean | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guests_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      planning_tasks: {
        Row: {
          color: string;
          created_at: string | null;
          description: string | null;
          end_month: number;
          id: string;
          name: string;
          position: number | null;
          start_month: number;
          status: string | null;
          updated_at: string | null;
          wedding_id: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          color?: string;
          created_at?: string | null;
          description?: string | null;
          end_month: number;
          id?: string;
          name: string;
          position?: number | null;
          start_month: number;
          status?: string | null;
          updated_at?: string | null;
          wedding_id: string;
          year: number;
        };
        Update: {
          color?: string;
          created_at?: string | null;
          description?: string | null;
          end_month?: number;
          id?: string;
          name?: string;
          position?: number | null;
          start_month?: number;
          status?: string | null;
          updated_at?: string | null;
          wedding_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "planning_tasks_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      registry_items: {
        Row: {
          created_at: string | null;
          currency: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean | null;
          is_claimed: boolean | null;
          price: number | null;
          sort_order: number | null;
          store_name: string | null;
          title: string;
          updated_at: string | null;
          url: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          is_claimed?: boolean | null;
          price?: number | null;
          sort_order?: number | null;
          store_name?: string | null;
          title: string;
          updated_at?: string | null;
          url?: string | null;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          is_claimed?: boolean | null;
          price?: number | null;
          sort_order?: number | null;
          store_name?: string | null;
          title?: string;
          updated_at?: string | null;
          url?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registry_items_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      rsvp_responses: {
        Row: {
          dietary_notes: string | null;
          dietary_requirements: string[] | null;
          event_id: string;
          guest_id: string;
          id: string;
          notes: string | null;
          responded_at: string | null;
          status: string;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          dietary_notes?: string | null;
          dietary_requirements?: string[] | null;
          event_id: string;
          guest_id: string;
          id?: string;
          notes?: string | null;
          responded_at?: string | null;
          status?: string;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          dietary_notes?: string | null;
          dietary_requirements?: string[] | null;
          event_id?: string;
          guest_id?: string;
          id?: string;
          notes?: string | null;
          responded_at?: string | null;
          status?: string;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rsvp_responses_event_id_fkey";
            columns: ["event_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "rsvp_responses_guest_id_fkey";
            columns: ["guest_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "rsvp_responses_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      seating_assignments: {
        Row: {
          created_at: string | null;
          guest_id: string;
          id: string;
          position: number;
          side: string;
          table_id: string;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          guest_id: string;
          id?: string;
          position: number;
          side: string;
          table_id: string;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          guest_id?: string;
          id?: string;
          position?: number;
          side?: string;
          table_id?: string;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seating_assignments_guest_id_fkey";
            columns: ["guest_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "seating_assignments_table_id_fkey";
            columns: ["table_id", "wedding_id"];
            isOneToOne: false;
            referencedRelation: "seating_tables";
            referencedColumns: ["id", "wedding_id"];
          },
          {
            foreignKeyName: "seating_assignments_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      seating_tables: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          seats_per_side: number;
          sort_order: number;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          seats_per_side?: number;
          sort_order?: number;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          seats_per_side?: number;
          sort_order?: number;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seating_tables_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      site_content: {
        Row: {
          content_type: string | null;
          created_at: string | null;
          id: string;
          key: string;
          label: string | null;
          updated_at: string | null;
          value: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          content_type?: string | null;
          created_at?: string | null;
          id?: string;
          key: string;
          label?: string | null;
          updated_at?: string | null;
          value?: string | null;
          wedding_id: string;
        };
        Update: {
          content_type?: string | null;
          created_at?: string | null;
          id?: string;
          key?: string;
          label?: string | null;
          updated_at?: string | null;
          value?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_content_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      tavily_cache: {
        Row: {
          created_at: string | null;
          expires_at: string | null;
          hit_count: number | null;
          id: string;
          last_accessed_at: string | null;
          query: string;
          query_hash: string;
          results: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          expires_at?: string | null;
          hit_count?: number | null;
          id?: string;
          last_accessed_at?: string | null;
          query: string;
          query_hash: string;
          results: NonNullable<Json>;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string | null;
          hit_count?: number | null;
          id?: string;
          last_accessed_at?: string | null;
          query?: string;
          query_hash?: string;
          results?: NonNullable<Json>;
        };
        Relationships: [];
      };
      tokens_usage: {
        Row: {
          completion_tokens: number | null;
          conversation_id: string | null;
          estimated_cost_usd: number | null;
          id: string;
          metadata: Json | null;
          model: string;
          prompt_tokens: number | null;
          provider: string;
          session_id: string | null;
          timestamp: string | null;
          total_tokens: number | null;
          user_id: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          completion_tokens?: number | null;
          conversation_id?: string | null;
          estimated_cost_usd?: number | null;
          id?: string;
          metadata?: Json | null;
          model: string;
          prompt_tokens?: number | null;
          provider: string;
          session_id?: string | null;
          timestamp?: string | null;
          total_tokens?: number | null;
          user_id?: string | null;
          wedding_id: string;
        };
        Update: {
          completion_tokens?: number | null;
          conversation_id?: string | null;
          estimated_cost_usd?: number | null;
          id?: string;
          metadata?: Json | null;
          model?: string;
          prompt_tokens?: number | null;
          provider?: string;
          session_id?: string | null;
          timestamp?: string | null;
          total_tokens?: number | null;
          user_id?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tokens_usage_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      transport_options: {
        Row: {
          capacity: number | null;
          created_at: string | null;
          departure_location: string | null;
          departure_time: string | null;
          direction: string;
          id: string;
          is_active: boolean | null;
          name: string;
          notes: string | null;
          return_time: string | null;
          sort_order: number | null;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          capacity?: number | null;
          created_at?: string | null;
          departure_location?: string | null;
          departure_time?: string | null;
          direction?: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
          notes?: string | null;
          return_time?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string | null;
          departure_location?: string | null;
          departure_time?: string | null;
          direction?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          notes?: string | null;
          return_time?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transport_options_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          anthropic_api_key: string | null;
          created_at: string | null;
          github_token: string | null;
          id: string;
          pinterest_board_url: string | null;
          tavily_api_key: string | null;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          anthropic_api_key?: string | null;
          created_at?: string | null;
          github_token?: string | null;
          id?: string;
          pinterest_board_url?: string | null;
          tavily_api_key?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          anthropic_api_key?: string | null;
          created_at?: string | null;
          github_token?: string | null;
          id?: string;
          pinterest_board_url?: string | null;
          tavily_api_key?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      venue_rooms: {
        Row: {
          amenities: string[] | null;
          capacity: number | null;
          created_at: string | null;
          extra_bed_type: string | null;
          floor: string | null;
          id: string;
          name: string;
          notes: string | null;
          reserved_for: string | null;
          room_type: string;
          section: string | null;
          sort_order: number | null;
          updated_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          amenities?: string[] | null;
          capacity?: number | null;
          created_at?: string | null;
          extra_bed_type?: string | null;
          floor?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          reserved_for?: string | null;
          room_type?: string;
          section?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id: string;
        };
        Update: {
          amenities?: string[] | null;
          capacity?: number | null;
          created_at?: string | null;
          extra_bed_type?: string | null;
          floor?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          reserved_for?: string | null;
          room_type?: string;
          section?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venue_rooms_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      wedding_domains: {
        Row: {
          hostname: string;
          id: string;
          is_primary: boolean;
          verified_at: string | null;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          hostname: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
          wedding_id: string;
        };
        Update: {
          hostname?: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wedding_domains_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      wedding_invitations: {
        Row: {
          accepted_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["wedding_role"];
          token_hash: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role: Database["public"]["Enums"]["wedding_role"];
          token_hash: string;
          wedding_id: string;
        };
        Update: {
          accepted_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["wedding_role"];
          token_hash?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wedding_invitations_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      wedding_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["wedding_role"];
          user_id: string;
          wedding_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["wedding_role"];
          user_id: string;
          wedding_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["wedding_role"];
          user_id?: string;
          wedding_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wedding_members_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      weddings: {
        Row: {
          contact_email: string | null;
          created_at: string;
          created_by: string | null;
          default_locale: string;
          display_name: string;
          id: string;
          locales: string[];
          partner_names: string[];
          settings: NonNullable<Json>;
          slug: string;
          status: string;
          theme: NonNullable<Json>;
          timezone: string;
          updated_at: string;
          wedding_date: string | null;
        };
        ComputedFields: never;
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_locale?: string;
          display_name: string;
          id?: string;
          locales?: string[];
          partner_names?: string[];
          settings?: NonNullable<Json>;
          slug: string;
          status?: string;
          theme?: NonNullable<Json>;
          timezone?: string;
          updated_at?: string;
          wedding_date?: string | null;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_locale?: string;
          display_name?: string;
          id?: string;
          locales?: string[];
          partner_names?: string[];
          settings?: NonNullable<Json>;
          slug?: string;
          status?: string;
          theme?: NonNullable<Json>;
          timezone?: string;
          updated_at?: string;
          wedding_date?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_tavily_metrics: {
        Row: {
          avg_response_time_ms: number | null;
          failed_calls: number | null;
          hour: string | null;
          max_response_time_ms: number | null;
          successful_calls: number | null;
          total_calls: number | null;
          wedding_id: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "api_logs_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      clean_expired_tavily_cache: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      is_any_wedding_member: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_wedding_member: {
        Args: {
          min_role?: Database["public"]["Enums"]["wedding_role"];
          w: string;
        };
        Returns: boolean;
      };
      is_wedding_public: { Args: { w: string }; Returns: boolean };
      reorder_checklist_items: {
        Args: { item_ids: string[]; list_id: string; p_wedding_id: string };
        Returns: undefined;
      };
      role_rank: {
        Args: { r: Database["public"]["Enums"]["wedding_role"] };
        Returns: number;
      };
      search_document_chunks: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          p_wedding_id: string;
          query_embedding: string;
        };
        Returns: {
          chunk_id: string;
          content: string;
          distance: number;
          document_filename: string;
          document_id: string;
          metadata: Json;
        }[];
      };
      wedding_role_of: {
        Args: { w: string };
        Returns: Database["public"]["Enums"]["wedding_role"];
      };
    };
    Enums: {
      wedding_role: "owner" | "partner" | "planner" | "editor" | "viewer";
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
  public: {
    Enums: {
      wedding_role: ["owner", "partner", "planner", "editor", "viewer"],
    },
  },
} as const;
