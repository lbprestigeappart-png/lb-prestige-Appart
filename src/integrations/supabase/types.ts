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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_id_documents: {
        Row: {
          back_path: string | null
          created_at: string
          front_path: string | null
          id: string
          id_number: string | null
          reservation_id: string
          updated_at: string
        }
        Insert: {
          back_path?: string | null
          created_at?: string
          front_path?: string | null
          id?: string
          id_number?: string | null
          reservation_id: string
          updated_at?: string
        }
        Update: {
          back_path?: string | null
          created_at?: string
          front_path?: string | null
          id?: string
          id_number?: string | null
          reservation_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          reservation_id: string
          sender: Database["public"]["Enums"]["message_sender"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          reservation_id: string
          sender: Database["public"]["Enums"]["message_sender"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          reservation_id?: string
          sender?: Database["public"]["Enums"]["message_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation_payment_summary"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "messages_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_type: string | null
          reference: string | null
          reservation_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_type?: string | null
          reference?: string | null
          reservation_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_type?: string | null
          reference?: string | null
          reservation_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation_payment_summary"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          banner_message: string | null
          banner_title: string | null
          banner_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_default: boolean
          location: string | null
          name: string
          subtitle: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          banner_message?: string | null
          banner_title?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          location?: string | null
          name: string
          subtitle?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          banner_message?: string | null
          banner_title?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          location?: string | null
          name?: string
          subtitle?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string
          client_id: string
          client_link_open_count: number
          client_link_opened_at: string | null
          client_token: string
          created_at: string
          guests: number
          id: string
          internal_notes: string | null
          property_id: string | null
          reservation_code: string
          rules_signed_at: string | null
          rules_signed_name: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          suite_type: string | null
          total_price: number
          updated_at: string
          whatsapp_welcome_sent: boolean
        }
        Insert: {
          check_in: string
          check_out: string
          client_id: string
          client_link_open_count?: number
          client_link_opened_at?: string | null
          client_token: string
          created_at?: string
          guests?: number
          id?: string
          internal_notes?: string | null
          property_id?: string | null
          reservation_code: string
          rules_signed_at?: string | null
          rules_signed_name?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          suite_type?: string | null
          total_price?: number
          updated_at?: string
          whatsapp_welcome_sent?: boolean
        }
        Update: {
          check_in?: string
          check_out?: string
          client_id?: string
          client_link_open_count?: number
          client_link_opened_at?: string | null
          client_token?: string
          created_at?: string
          guests?: number
          id?: string
          internal_notes?: string | null
          property_id?: string | null
          reservation_code?: string
          rules_signed_at?: string | null
          rules_signed_name?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          suite_type?: string | null
          total_price?: number
          updated_at?: string
          whatsapp_welcome_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_ref: string | null
          cleanliness: number | null
          client_id: string | null
          comfort: number | null
          comment: string | null
          country: string | null
          created_at: string
          guest_name: string | null
          id: string
          is_published: boolean
          location_score: number | null
          rating: number
          reservation_id: string | null
          staff: number | null
          status: string
          stay_date: string | null
          value: number | null
        }
        Insert: {
          booking_ref?: string | null
          cleanliness?: number | null
          client_id?: string | null
          comfort?: number | null
          comment?: string | null
          country?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          is_published?: boolean
          location_score?: number | null
          rating: number
          reservation_id?: string | null
          staff?: number | null
          status?: string
          stay_date?: string | null
          value?: number | null
        }
        Update: {
          booking_ref?: string | null
          cleanliness?: number | null
          client_id?: string | null
          comfort?: number | null
          comment?: string | null
          country?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          is_published?: boolean
          location_score?: number | null
          rating?: number
          reservation_id?: string | null
          staff?: number | null
          status?: string
          stay_date?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation_payment_summary"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      useful_documents: {
        Row: {
          created_at: string
          display_order: number
          external_url: string | null
          file_size: string | null
          file_type: string
          id: string
          is_public: boolean
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          external_url?: string | null
          file_size?: string | null
          file_type?: string
          id?: string
          is_public?: boolean
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          external_url?: string | null
          file_size?: string | null
          file_type?: string
          id?: string
          is_public?: boolean
          storage_path?: string | null
          title?: string
          updated_at?: string
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
      whatsapp_automations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          offset_days: number
          template_key: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          offset_days?: number
          template_key: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          offset_days?: number
          template_key?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          content: string
          created_at: string
          error_message: string | null
          id: string
          mode: string | null
          provider_message_id: string | null
          recipient_name: string | null
          recipient_phone: string
          reservation_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["whatsapp_status"]
          template_key: string | null
          wa_link: string | null
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          mode?: string | null
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          reservation_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          template_key?: string | null
          wa_link?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          mode?: string | null
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          reservation_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          template_key?: string | null
          wa_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation_payment_summary"
            referencedColumns: ["reservation_id"]
          },
          {
            foreignKeyName: "whatsapp_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      reservation_payment_summary: {
        Row: {
          paid_amount: number | null
          payment_status_label: string | null
          remaining_amount: number | null
          reservation_id: string | null
          total_price: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_reservation_code: { Args: never; Returns: string }
      generate_reservation_token: { Args: never; Returns: string }
      get_client_messages: {
        Args: { _token: string }
        Returns: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          reservation_id: string
          sender: Database["public"]["Enums"]["message_sender"]
        }[]
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_client_space: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_client_link_opened: { Args: { _token: string }; Returns: undefined }
      send_client_message: {
        Args: { _content: string; _token: string }
        Returns: string
      }
      sign_rules: {
        Args: { _signed_name: string; _token: string }
        Returns: undefined
      }
      submit_client_booking_review: {
        Args: {
          _booking_ref: string
          _cleanliness: number
          _comfort: number
          _comment: string
          _country: string
          _global_score: number
          _guest_name: string
          _location: number
          _staff: number
          _token: string
          _value: number
        }
        Returns: string
      }
      submit_client_id: {
        Args: {
          _back_path: string
          _front_path: string
          _id_number: string
          _token: string
        }
        Returns: string
      }
      submit_client_review: {
        Args: { _comment: string; _rating: number; _token: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "owner"
      message_sender: "admin" | "client"
      notification_type:
        | "reservation"
        | "message"
        | "arrival"
        | "departure"
        | "review"
        | "payment"
        | "system"
        | "rules_signed"
      payment_status: "pending" | "partial" | "paid" | "refunded"
      reservation_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      whatsapp_status:
        | "pending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "fallback_wa"
        | "manual_required"
        | "error"
        | "opened_wa"
        | "manual_sent_pending_confirmation"
        | "sent_manually"
        | "failed_manual"
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
      app_role: ["admin", "owner"],
      message_sender: ["admin", "client"],
      notification_type: [
        "reservation",
        "message",
        "arrival",
        "departure",
        "review",
        "payment",
        "system",
        "rules_signed",
      ],
      payment_status: ["pending", "partial", "paid", "refunded"],
      reservation_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      whatsapp_status: [
        "pending",
        "sent",
        "delivered",
        "read",
        "failed",
        "fallback_wa",
        "manual_required",
        "error",
        "opened_wa",
        "manual_sent_pending_confirmation",
        "sent_manually",
        "failed_manual",
      ],
    },
  },
} as const
