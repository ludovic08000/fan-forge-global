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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_moderation_queue: {
        Row: {
          action_taken: string | null
          admin_notes: string | null
          ai_category: string | null
          ai_confidence: number | null
          ai_flags: Json | null
          ai_issues: string[] | null
          ai_model: string | null
          ai_reason: string | null
          ai_recommendation: string
          analyzed_at: string | null
          content_id: string | null
          content_type: string
          created_at: string
          file_url: string
          id: string
          message_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          admin_notes?: string | null
          ai_category?: string | null
          ai_confidence?: number | null
          ai_flags?: Json | null
          ai_issues?: string[] | null
          ai_model?: string | null
          ai_reason?: string | null
          ai_recommendation: string
          analyzed_at?: string | null
          content_id?: string | null
          content_type: string
          created_at?: string
          file_url: string
          id?: string
          message_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          admin_notes?: string | null
          ai_category?: string | null
          ai_confidence?: number | null
          ai_flags?: Json | null
          ai_issues?: string[] | null
          ai_model?: string | null
          ai_reason?: string | null
          ai_recommendation?: string
          analyzed_at?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string
          file_url?: string
          id?: string
          message_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_moderation_queue_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_moderation_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "private_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_message_logs: {
        Row: {
          id: string
          message_type: string
          sent_at: string
          subscription_id: string
        }
        Insert: {
          id?: string
          message_type: string
          sent_at?: string
          subscription_id: string
        }
        Update: {
          id?: string
          message_type?: string
          sent_at?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_message_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_content: {
        Row: {
          content_id: string
          created_at: string
          id: string
          partnership_id: string
          primary_creator_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          partnership_id: string
          primary_creator_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          partnership_id?: string
          primary_creator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_content_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_content_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "creator_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_content_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "collaborative_content_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_content_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_content_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_revenue_transactions: {
        Row: {
          content_id: string | null
          created_at: string
          currency: string
          error_message: string | null
          id: string
          partner_amount: number
          partner_creator_id: string
          partnership_id: string | null
          primary_amount: number
          primary_creator_id: string
          revenue_type: string
          status: string
          stripe_transfer_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          partner_amount?: number
          partner_creator_id: string
          partnership_id?: string | null
          primary_amount?: number
          primary_creator_id: string
          revenue_type: string
          status?: string
          stripe_transfer_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          partner_amount?: number
          partner_creator_id?: string
          partnership_id?: string | null
          primary_amount?: number
          primary_creator_id?: string
          revenue_type?: string
          status?: string
          stripe_transfer_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_revenue_transactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_partner_creator_id_fkey"
            columns: ["partner_creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_partner_creator_id_fkey"
            columns: ["partner_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_partner_creator_id_fkey"
            columns: ["partner_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_partner_creator_id_fkey"
            columns: ["partner_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "creator_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_revenue_transactions_primary_creator_id_fkey"
            columns: ["primary_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          creator_id: string
          description: string | null
          duration: number | null
          file_size: number | null
          file_url: string
          id: string
          is_premium: boolean | null
          is_preview: boolean
          like_count: number | null
          price: number | null
          status: Database["public"]["Enums"]["content_status"] | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          creator_id: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          file_url: string
          id?: string
          is_premium?: boolean | null
          is_preview?: boolean
          like_count?: number | null
          price?: number | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          creator_id?: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_premium?: boolean | null
          is_preview?: boolean
          like_count?: number | null
          price?: number | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      content_leaks: {
        Row: {
          action_taken: string | null
          action_taken_at: string | null
          action_taken_by: string | null
          created_at: string
          detected_at: string
          detected_by: string
          id: string
          leak_timestamp: string | null
          notes: string | null
          short_id: string
          source_url: string | null
          status: string
          updated_at: string
          user_id: string
          watermark_pattern: string
        }
        Insert: {
          action_taken?: string | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string
          detected_at?: string
          detected_by: string
          id?: string
          leak_timestamp?: string | null
          notes?: string | null
          short_id: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          watermark_pattern: string
        }
        Update: {
          action_taken?: string | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string
          detected_at?: string
          detected_by?: string
          id?: string
          leak_timestamp?: string | null
          notes?: string | null
          short_id?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          watermark_pattern?: string
        }
        Relationships: []
      }
      content_likes: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_likes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_views: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          view_duration: number | null
          viewer_id: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          view_duration?: number | null
          viewer_id?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          view_duration?: number | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_auto_messages: {
        Row: {
          content: string
          created_at: string
          creator_id: string
          days_before_expiration: number | null
          id: string
          is_enabled: boolean
          media_type: string | null
          media_url: string | null
          message_type: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          creator_id: string
          days_before_expiration?: number | null
          id?: string
          is_enabled?: boolean
          media_type?: string | null
          media_url?: string | null
          message_type: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          creator_id?: string
          days_before_expiration?: number | null
          id?: string
          is_enabled?: boolean
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_auto_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_auto_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_auto_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_auto_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_invoices: {
        Row: {
          created_at: string
          creator_address: string | null
          creator_country: string
          creator_iban: string | null
          creator_id: string
          creator_name: string
          creator_tax_id: string | null
          currency: string
          finalized_at: string | null
          gross_amount: number
          id: string
          invoice_number: string
          live_revenue: number
          net_amount: number
          paid_at: string | null
          payment_request_id: string | null
          period_end: string
          period_start: string
          platform_commission_amount: number
          platform_commission_rate: number
          private_content_revenue: number
          status: string
          subscription_revenue: number
          tips_revenue: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          creator_address?: string | null
          creator_country?: string
          creator_iban?: string | null
          creator_id: string
          creator_name: string
          creator_tax_id?: string | null
          currency?: string
          finalized_at?: string | null
          gross_amount?: number
          id?: string
          invoice_number: string
          live_revenue?: number
          net_amount?: number
          paid_at?: string | null
          payment_request_id?: string | null
          period_end: string
          period_start: string
          platform_commission_amount?: number
          platform_commission_rate?: number
          private_content_revenue?: number
          status?: string
          subscription_revenue?: number
          tips_revenue?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          creator_address?: string | null
          creator_country?: string
          creator_iban?: string | null
          creator_id?: string
          creator_name?: string
          creator_tax_id?: string | null
          currency?: string
          finalized_at?: string | null
          gross_amount?: number
          id?: string
          invoice_number?: string
          live_revenue?: number
          net_amount?: number
          paid_at?: string | null
          payment_request_id?: string | null
          period_end?: string
          period_start?: string
          platform_commission_amount?: number
          platform_commission_rate?: number
          private_content_revenue?: number
          status?: string
          subscription_revenue?: number
          tips_revenue?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_invoices_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_invoices_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_invoices_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_invoices_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_invoices_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "creator_payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_partnerships: {
        Row: {
          accepted_at: string | null
          collaboration_type: string[] | null
          created_at: string
          id: string
          message: string | null
          partner_id: string
          partnership_type: string | null
          requester_id: string
          revenue_share_partner: number
          revenue_share_requester: number
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          collaboration_type?: string[] | null
          created_at?: string
          id?: string
          message?: string | null
          partner_id: string
          partnership_type?: string | null
          requester_id: string
          revenue_share_partner?: number
          revenue_share_requester?: number
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          collaboration_type?: string[] | null
          created_at?: string
          id?: string
          message?: string | null
          partner_id?: string
          partnership_type?: string | null
          requester_id?: string
          revenue_share_partner?: number
          revenue_share_requester?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_partnerships_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_partnerships_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_partnerships_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_partnerships_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_partnerships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_partnerships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_partnerships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_partnerships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payment_requests: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          currency: string
          error_message: string | null
          id: string
          period_end: string
          period_start: string
          processed_at: string | null
          requested_at: string | null
          status: string
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          currency?: string
          error_message?: string | null
          id?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          currency?: string
          error_message?: string | null
          id?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payment_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_payment_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payment_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payment_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_referral_codes: {
        Row: {
          code: string
          commission_rate: number
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          total_earnings: number
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          commission_rate?: number
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          total_earnings?: number
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          commission_rate?: number
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          total_earnings?: number
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_stories: {
        Row: {
          caption: string | null
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          image_url: string
          view_count: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          creator_id: string
          expires_at?: string
          id?: string
          image_url: string
          view_count?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          image_url?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_stories_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_stories_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_stories_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_stories_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          bank_account_holder: string | null
          bank_bic: string | null
          bank_country: string | null
          bank_iban: string | null
          blocked_countries: string[] | null
          category: string | null
          content_type: string[] | null
          created_at: string | null
          currency: string | null
          featured_until: string | null
          gender: string | null
          hide_from_search_engines: boolean | null
          hide_subscriber_count: boolean | null
          id: string
          is_accepting_tips: boolean | null
          is_featured: boolean | null
          is_paused: boolean | null
          lives_blocked_until: string | null
          noshow_count: number | null
          noshow_penalty_level: number | null
          orientation: string | null
          paused_at: string | null
          payment_frequency: string | null
          platform_commission_rate: number | null
          preferred_language: string | null
          stage_name: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarding_completed: boolean | null
          stripe_payouts_enabled: boolean | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          subscription_price: number | null
          tax_id: string | null
          total_content: number | null
          total_earnings: number | null
          total_subscribers: number | null
          updated_at: string | null
          user_id: string
          visibility_reduced: boolean | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_country?: string | null
          bank_iban?: string | null
          blocked_countries?: string[] | null
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          hide_from_search_engines?: boolean | null
          hide_subscriber_count?: boolean | null
          id?: string
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          is_paused?: boolean | null
          lives_blocked_until?: string | null
          noshow_count?: number | null
          noshow_penalty_level?: number | null
          orientation?: string | null
          paused_at?: string | null
          payment_frequency?: string | null
          platform_commission_rate?: number | null
          preferred_language?: string | null
          stage_name?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subscription_price?: number | null
          tax_id?: string | null
          total_content?: number | null
          total_earnings?: number | null
          total_subscribers?: number | null
          updated_at?: string | null
          user_id: string
          visibility_reduced?: boolean | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_country?: string | null
          bank_iban?: string | null
          blocked_countries?: string[] | null
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          hide_from_search_engines?: boolean | null
          hide_subscriber_count?: boolean | null
          id?: string
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          is_paused?: boolean | null
          lives_blocked_until?: string | null
          noshow_count?: number | null
          noshow_penalty_level?: number | null
          orientation?: string | null
          paused_at?: string | null
          payment_frequency?: string | null
          platform_commission_rate?: number | null
          preferred_language?: string | null
          stage_name?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subscription_price?: number | null
          tax_id?: string | null
          total_content?: number | null
          total_earnings?: number | null
          total_subscribers?: number | null
          updated_at?: string | null
          user_id?: string
          visibility_reduced?: boolean | null
        }
        Relationships: []
      }
      duplicate_detections: {
        Row: {
          action_taken: string | null
          action_taken_at: string | null
          action_taken_by: string | null
          created_at: string
          detected_platform: string | null
          detected_url: string | null
          detection_type: string
          duplicate_fingerprint_id: string | null
          id: string
          notes: string | null
          original_fingerprint_id: string
          similarity_score: number | null
        }
        Insert: {
          action_taken?: string | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string
          detected_platform?: string | null
          detected_url?: string | null
          detection_type: string
          duplicate_fingerprint_id?: string | null
          id?: string
          notes?: string | null
          original_fingerprint_id: string
          similarity_score?: number | null
        }
        Update: {
          action_taken?: string | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string
          detected_platform?: string | null
          detected_url?: string | null
          detection_type?: string
          duplicate_fingerprint_id?: string | null
          id?: string
          notes?: string | null
          original_fingerprint_id?: string
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_detections_duplicate_fingerprint_id_fkey"
            columns: ["duplicate_fingerprint_id"]
            isOneToOne: false
            referencedRelation: "media_fingerprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_detections_original_fingerprint_id_fkey"
            columns: ["original_fingerprint_id"]
            isOneToOne: false
            referencedRelation: "media_fingerprints"
            referencedColumns: ["id"]
          },
        ]
      }
      email_action_logs: {
        Row: {
          action: string
          created_at: string
          email_hash: string
          id: string
          ip_address: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          email_hash: string
          id?: string
          ip_address: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          email_hash?: string
          id?: string
          ip_address?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          creator_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          birthdate: string
          created_at: string
          document_number: string | null
          document_type: string
          expires_at: string | null
          full_name: string
          id: string
          id_back_url: string | null
          id_front_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_with_id_url: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthdate: string
          created_at?: string
          document_number?: string | null
          document_type: string
          expires_at?: string | null
          full_name: string
          id?: string
          id_back_url?: string | null
          id_front_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_with_id_url: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthdate?: string
          created_at?: string
          document_number?: string | null
          document_type?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_with_id_url?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_reservations: {
        Row: {
          created_at: string
          id: string
          live_stream_id: string
          notified: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_stream_id: string
          notified?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_stream_id?: string
          notified?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_reservations_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_reservations_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_bans: {
        Row: {
          banned_by: string
          created_at: string | null
          expires_at: string | null
          id: string
          live_stream_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          live_stream_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          live_stream_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_bans_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_bans_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_messages: {
        Row: {
          content_offer: Json | null
          created_at: string | null
          id: string
          live_stream_id: string
          message: string
          message_type: string
          user_id: string
          username: string
        }
        Insert: {
          content_offer?: Json | null
          created_at?: string | null
          id?: string
          live_stream_id: string
          message: string
          message_type?: string
          user_id: string
          username: string
        }
        Update: {
          content_offer?: Json | null
          created_at?: string | null
          id?: string
          live_stream_id?: string
          message?: string
          message_type?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_messages_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_messages_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          live_stream_id: string
          status: string
          stripe_payment_intent_id: string | null
          subscriber_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          live_stream_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          subscriber_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          live_stream_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_payments_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_payments_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_revenue: {
        Row: {
          created_at: string
          creator_id: string
          currency: string
          id: string
          live_stream_id: string
          minute_number: number
          revenue_amount: number
          viewer_count: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          live_stream_id: string
          minute_number: number
          revenue_amount?: number
          viewer_count?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          live_stream_id?: string
          minute_number?: number
          revenue_amount?: number
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "live_stream_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_revenue_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_revenue_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_settings: {
        Row: {
          created_at: string | null
          id: string
          live_stream_id: string
          slow_mode_enabled: boolean | null
          slow_mode_interval: number | null
          subscribers_only: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          live_stream_id: string
          slow_mode_enabled?: boolean | null
          slow_mode_interval?: number | null
          subscribers_only?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          live_stream_id?: string
          slow_mode_enabled?: boolean | null
          slow_mode_interval?: number | null
          subscribers_only?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_settings_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: true
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_settings_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: true
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_viewers: {
        Row: {
          id: string
          joined_at: string | null
          left_at: string | null
          live_stream_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          live_stream_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          live_stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_viewers_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_viewers_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          egress_id: string | null
          enable_recording: boolean
          ended_at: string | null
          extension_count: number | null
          id: string
          is_premium: boolean | null
          last_heartbeat: string | null
          max_duration_minutes: number | null
          peak_viewer_count: number | null
          price: number | null
          recording_completed_at: string | null
          recording_error: string | null
          recording_started_at: string | null
          recording_url: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          stream_key: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          viewer_count: number | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          egress_id?: string | null
          enable_recording?: boolean
          ended_at?: string | null
          extension_count?: number | null
          id?: string
          is_premium?: boolean | null
          last_heartbeat?: string | null
          max_duration_minutes?: number | null
          peak_viewer_count?: number | null
          price?: number | null
          recording_completed_at?: string | null
          recording_error?: string | null
          recording_started_at?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          viewer_count?: number | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          egress_id?: string | null
          enable_recording?: boolean
          ended_at?: string | null
          extension_count?: number | null
          id?: string
          is_premium?: boolean | null
          last_heartbeat?: string | null
          max_duration_minutes?: number | null
          peak_viewer_count?: number | null
          price?: number | null
          recording_completed_at?: string | null
          recording_error?: string | null
          recording_started_at?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_type: string
          created_at: string | null
          id: string
          identifier: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempt_type?: string
          created_at?: string | null
          id?: string
          identifier: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string | null
          id?: string
          identifier?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      media_fingerprints: {
        Row: {
          content_id: string | null
          created_at: string
          creator_id: string | null
          duration: number | null
          file_size: number | null
          file_type: string
          file_url: string
          height: number | null
          id: string
          message_id: string | null
          mime_type: string | null
          original_filename: string | null
          phash: string | null
          sha256_hash: string
          upload_ip: string | null
          uploader_id: string
          user_agent: string | null
          verified_at: string | null
          video_fingerprint: string | null
          watermark_id: string | null
          watermark_pattern: string | null
          width: number | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          creator_id?: string | null
          duration?: number | null
          file_size?: number | null
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          original_filename?: string | null
          phash?: string | null
          sha256_hash: string
          upload_ip?: string | null
          uploader_id: string
          user_agent?: string | null
          verified_at?: string | null
          video_fingerprint?: string | null
          watermark_id?: string | null
          watermark_pattern?: string | null
          width?: number | null
        }
        Update: {
          content_id?: string | null
          created_at?: string
          creator_id?: string | null
          duration?: number | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          original_filename?: string | null
          phash?: string | null
          sha256_hash?: string
          upload_ip?: string | null
          uploader_id?: string
          user_agent?: string | null
          verified_at?: string | null
          video_fingerprint?: string | null
          watermark_id?: string | null
          watermark_pattern?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_fingerprints_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_fingerprints_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "media_fingerprints_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_fingerprints_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_fingerprints_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_fingerprints_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "private_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      partnership_revenue: {
        Row: {
          content_id: string | null
          created_at: string
          currency: string
          id: string
          partner_share: number
          partnership_id: string
          requester_share: number
          revenue_type: string
          total_amount: number
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          partner_share?: number
          partnership_id: string
          requester_share?: number
          revenue_type: string
          total_amount?: number
        }
        Update: {
          content_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          partner_share?: number
          partnership_id?: string
          requester_share?: number
          revenue_type?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "partnership_revenue_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_revenue_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "creator_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          creator_id: string
          creator_payout: number
          currency: string
          id: string
          live_revenue: number
          payment_request_id: string | null
          period_end: string
          period_start: string
          private_content_revenue: number
          subscription_revenue: number
          tips_revenue: number
          total_revenue: number
        }
        Insert: {
          commission_amount: number
          commission_rate?: number
          created_at?: string | null
          creator_id: string
          creator_payout: number
          currency?: string
          id?: string
          live_revenue?: number
          payment_request_id?: string | null
          period_end: string
          period_start: string
          private_content_revenue?: number
          subscription_revenue?: number
          tips_revenue?: number
          total_revenue: number
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          creator_id?: string
          creator_payout?: number
          currency?: string
          id?: string
          live_revenue?: number
          payment_request_id?: string | null
          period_end?: string
          period_start?: string
          private_content_revenue?: number
          subscription_revenue?: number
          tips_revenue?: number
          total_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_commissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "platform_commissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_commissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_commissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_commissions_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "creator_payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      private_content_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          message_id: string
          status: string | null
          stripe_payment_intent_id: string | null
          subscriber_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          message_id: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          subscriber_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          message_id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          subscriber_id?: string
        }
        Relationships: []
      }
      private_live_requests: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          creator_id: string
          creator_response: string | null
          currency: string | null
          id: string
          live_stream_id: string | null
          message: string | null
          no_show_reported_at: string | null
          no_show_reported_by: string | null
          paid_at: string | null
          price: number | null
          proposed_date: string
          proposed_duration: number | null
          reminder_1h_sent: boolean | null
          reminder_24h_sent: boolean | null
          requester_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id: string
          creator_response?: string | null
          currency?: string | null
          id?: string
          live_stream_id?: string | null
          message?: string | null
          no_show_reported_at?: string | null
          no_show_reported_by?: string | null
          paid_at?: string | null
          price?: number | null
          proposed_date: string
          proposed_duration?: number | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          requester_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          creator_response?: string | null
          currency?: string | null
          id?: string
          live_stream_id?: string | null
          message?: string | null
          no_show_reported_at?: string | null
          no_show_reported_by?: string | null
          paid_at?: string | null
          price?: number | null
          proposed_date?: string
          proposed_duration?: number | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          requester_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_live_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "private_live_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_live_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_live_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_live_requests_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_live_requests_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      private_live_revenue: {
        Row: {
          created_at: string
          creator_amount: number
          creator_id: string
          creator_penalty: number | null
          currency: string | null
          gross_amount: number
          id: string
          platform_commission: number
          private_live_request_id: string
          refund_reason: string | null
          refunded_at: string | null
          requester_id: string
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
        }
        Insert: {
          created_at?: string
          creator_amount: number
          creator_id: string
          creator_penalty?: number | null
          currency?: string | null
          gross_amount: number
          id?: string
          platform_commission: number
          private_live_request_id: string
          refund_reason?: string | null
          refunded_at?: string | null
          requester_id: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
        }
        Update: {
          created_at?: string
          creator_amount?: number
          creator_id?: string
          creator_penalty?: number | null
          currency?: string | null
          gross_amount?: number
          id?: string
          platform_commission?: number
          private_live_request_id?: string
          refund_reason?: string | null
          refunded_at?: string | null
          requester_id?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_live_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "private_live_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_live_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_live_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_live_revenue_private_live_request_id_fkey"
            columns: ["private_live_request_id"]
            isOneToOne: false
            referencedRelation: "private_live_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      private_messages: {
        Row: {
          content: string | null
          created_at: string
          creator_id: string
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          is_paid: boolean | null
          media_thumbnail: string | null
          media_url: string | null
          message_type: string
          price: number | null
          read_at: string | null
          sender_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_paid?: boolean | null
          media_thumbnail?: string | null
          media_url?: string | null
          message_type?: string
          price?: number | null
          read_at?: string | null
          sender_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          creator_id?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_paid?: boolean | null
          media_thumbnail?: string | null
          media_url?: string | null
          message_type?: string
          price?: number | null
          read_at?: string | null
          sender_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      processed_stripe_sessions: {
        Row: {
          amount: number | null
          created_at: string
          creator_id: string | null
          id: string
          metadata: Json | null
          processed_at: string
          session_id: string
          session_type: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string
          session_id: string
          session_type?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string
          session_id?: string
          session_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          cookie_consent: Json | null
          cover_position: number | null
          cover_position_x: number | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          gender: string | null
          id: string
          instagram_url: string | null
          is_identity_verified: boolean | null
          is_verified: boolean | null
          location: string | null
          orientation: string | null
          otp_verified: boolean | null
          phone: string | null
          privacy_accepted_at: string | null
          privacy_version: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          cookie_consent?: Json | null
          cover_position?: number | null
          cover_position_x?: number | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          instagram_url?: string | null
          is_identity_verified?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          orientation?: string | null
          otp_verified?: boolean | null
          phone?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          cookie_consent?: Json | null
          cover_position?: number | null
          cover_position_x?: number | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          instagram_url?: string | null
          is_identity_verified?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          orientation?: string | null
          otp_verified?: boolean | null
          phone?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      quarantine_files: {
        Row: {
          created_at: string
          expires_at: string
          file_size: number
          id: string
          mime_type: string | null
          original_filename: string
          quarantined_at: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scan_id: string | null
          scan_result: Json | null
          status: string
          storage_path: string
          threat_details: string | null
          threat_type: string | null
          updated_at: string
          uploader_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          file_size: number
          id?: string
          mime_type?: string | null
          original_filename: string
          quarantined_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_id?: string | null
          scan_result?: Json | null
          status?: string
          storage_path: string
          threat_details?: string | null
          threat_type?: string | null
          updated_at?: string
          uploader_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          original_filename?: string
          quarantined_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_id?: string | null
          scan_result?: Json | null
          status?: string
          storage_path?: string
          threat_details?: string | null
          threat_type?: string | null
          updated_at?: string
          uploader_id?: string | null
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          creator_id: string
          current_uses: number | null
          discount_amount: number | null
          discount_percentage: number | null
          duration_months: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          creator_id: string
          current_uses?: number | null
          discount_amount?: number | null
          discount_percentage?: number | null
          duration_months?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          creator_id?: string
          current_uses?: number | null
          discount_amount?: number | null
          discount_percentage?: number | null
          duration_months?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_subscriptions: {
        Row: {
          commission_paid: number
          created_at: string
          id: string
          referral_code_id: string
          referred_user_id: string
          referrer_creator_id: string
          subscribed_to_creator_id: string
          subscription_id: string | null
        }
        Insert: {
          commission_paid?: number
          created_at?: string
          id?: string
          referral_code_id: string
          referred_user_id: string
          referrer_creator_id: string
          subscribed_to_creator_id: string
          subscription_id?: string | null
        }
        Update: {
          commission_paid?: number
          created_at?: string
          id?: string
          referral_code_id?: string
          referred_user_id?: string
          referrer_creator_id?: string
          subscribed_to_creator_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_subscriptions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "creator_referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_subscriptions_referrer_creator_id_fkey"
            columns: ["referrer_creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "referral_subscriptions_referrer_creator_id_fkey"
            columns: ["referrer_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_subscriptions_referrer_creator_id_fkey"
            columns: ["referrer_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_subscriptions_referrer_creator_id_fkey"
            columns: ["referrer_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_subscriptions_subscribed_to_creator_id_fkey"
            columns: ["subscribed_to_creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "referral_subscriptions_subscribed_to_creator_id_fkey"
            columns: ["subscribed_to_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_subscriptions_subscribed_to_creator_id_fkey"
            columns: ["subscribed_to_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_subscriptions_subscribed_to_creator_id_fkey"
            columns: ["subscribed_to_creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_subscriptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_uses: {
        Row: {
          discount_applied: number | null
          id: string
          referral_code_id: string
          subscriber_id: string
          subscription_id: string | null
          used_at: string | null
        }
        Insert: {
          discount_applied?: number | null
          id?: string
          referral_code_id: string
          subscriber_id: string
          subscription_id?: string | null
          used_at?: string | null
        }
        Update: {
          discount_applied?: number | null
          id?: string
          referral_code_id?: string
          subscriber_id?: string
          subscription_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_uses_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_email_tokens: {
        Row: {
          action: string
          created_at: string
          email_hash: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          action: string
          created_at?: string
          email_hash: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          email_hash?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      security_blocks: {
        Row: {
          block_type: string
          blocked_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          identifier: string
          is_active: boolean | null
          reason: string | null
        }
        Insert: {
          block_type?: string
          blocked_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          identifier: string
          is_active?: boolean | null
          reason?: string | null
        }
        Update: {
          block_type?: string
          blocked_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          identifier?: string
          is_active?: boolean | null
          reason?: string | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "creator_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          creator_id: string
          currency: string | null
          end_date: string | null
          id: string
          price: number
          start_date: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id: string | null
          subscriber_id: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          creator_id: string
          currency?: string | null
          end_date?: string | null
          id?: string
          price: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          subscriber_id: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          end_date?: string | null
          id?: string
          price?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          subscriber_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount: number
          content_id: string | null
          created_at: string | null
          creator_id: string
          currency: string | null
          id: string
          message: string | null
          sender_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          content_id?: string | null
          created_at?: string | null
          creator_id: string
          currency?: string | null
          id?: string
          message?: string | null
          sender_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          content_id?: string | null
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          id?: string
          message?: string | null
          sender_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_login_logs: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          ip_address: string | null
          login_method: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          login_method?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          login_method?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_photos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          leak_id: string | null
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string
          suspended_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          leak_id?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          suspended_at?: string
          suspended_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          leak_id?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          suspended_at?: string
          suspended_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_suspensions_leak_id_fkey"
            columns: ["leak_id"]
            isOneToOne: false
            referencedRelation: "content_leaks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_creator_revenue: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string | null
          currency: string | null
          live_revenue: number | null
          private_content_revenue: number | null
          stage_name: string | null
          subscription_revenue: number | null
          tips_revenue: number | null
          total_content: number | null
          total_revenue: number | null
          total_subscribers: number | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_niche_analytics: {
        Row: {
          active_subscriptions: number | null
          arpu: number | null
          conversion_rate: number | null
          niche: string | null
          total_creators: number | null
          total_revenue: number | null
          unique_subscribers: number | null
        }
        Relationships: []
      }
      admin_platform_arpu: {
        Row: {
          arpu: number | null
          live_revenue: number | null
          month: string | null
          paying_users: number | null
          private_content_revenue: number | null
          subscription_revenue: number | null
          tips_revenue: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      admin_subscription_retention: {
        Row: {
          churn_rate: number | null
          churned_subscribers: number | null
          cohort_month: string | null
          retained_subscribers: number | null
          retention_rate: number | null
          total_subscribers: number | null
        }
        Relationships: []
      }
      public_creator_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_verified: boolean | null
          location: string | null
          user_id: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_creators: {
        Row: {
          category: string | null
          content_type: string[] | null
          created_at: string | null
          currency: string | null
          featured_until: string | null
          gender: string | null
          id: string | null
          is_accepting_tips: boolean | null
          is_featured: boolean | null
          orientation: string | null
          stage_name: string | null
          subscription_price: number | null
          total_content: number | null
          total_subscribers: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          id?: string | null
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          orientation?: string | null
          stage_name?: string | null
          subscription_price?: number | null
          total_content?: number | null
          total_subscribers?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          id?: string | null
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          orientation?: string | null
          stage_name?: string | null
          subscription_price?: number | null
          total_content?: number | null
          total_subscribers?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_creators_safe: {
        Row: {
          category: string | null
          content_type: string[] | null
          created_at: string | null
          currency: string | null
          featured_until: string | null
          gender: string | null
          id: string | null
          is_accepting_tips: boolean | null
          is_featured: boolean | null
          is_paused: boolean | null
          orientation: string | null
          stage_name: string | null
          subscription_price: number | null
          total_content: number | null
          total_subscribers: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          id?: string | null
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          is_paused?: boolean | null
          orientation?: string | null
          stage_name?: string | null
          subscription_price?: number | null
          total_content?: number | null
          total_subscribers?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          id?: string | null
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          is_paused?: boolean | null
          orientation?: string | null
          stage_name?: string | null
          subscription_price?: number | null
          total_content?: number | null
          total_subscribers?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_live_streams: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          ended_at: string | null
          id: string | null
          is_premium: boolean | null
          peak_viewer_count: number | null
          price: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          viewer_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "admin_creator_revenue"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_creators_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles_safe: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_identity_verified: boolean | null
          is_verified: boolean | null
          location: string | null
          user_id: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_identity_verified?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_identity_verified?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_block_if_needed: {
        Args: {
          block_duration?: unknown
          check_identifier: string
          check_ip?: string
          max_attempts?: number
        }
        Returns: boolean
      }
      auto_cleanup_stale_lives: { Args: never; Returns: undefined }
      calculate_creator_revenue_with_commission: {
        Args: { creator_uuid: string; end_date?: string; start_date?: string }
        Returns: {
          commission_amount: number
          live_revenue: number
          private_content_revenue: number
          subscription_revenue: number
          tips_revenue: number
          total_after_commission: number
          total_before_commission: number
        }[]
      }
      calculate_creator_total_revenue: {
        Args: {
          creator_uuid: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: number
      }
      calculate_live_revenue: {
        Args: { _live_stream_id: string; _minute_number: number }
        Returns: undefined
      }
      check_duplicate_hash: {
        Args: { p_sha256_hash: string }
        Returns: {
          content_id: string
          created_at: string
          file_url: string
          fingerprint_id: string
          uploader_id: string
        }[]
      }
      cleanup_expired_otp_codes: { Args: never; Returns: undefined }
      cleanup_expired_quarantine: { Args: never; Returns: number }
      cleanup_old_email_logs: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_paused_creators: { Args: never; Returns: number }
      cleanup_stale_live_streams: { Args: never; Returns: undefined }
      count_failed_attempts: {
        Args: { check_identifier: string; time_window?: unknown }
        Returns: number
      }
      delete_creator_completely: {
        Args: { _creator_id: string }
        Returns: undefined
      }
      delete_user_completely: { Args: { _user_id: string }; Returns: undefined }
      find_similar_images: {
        Args: { p_max_distance?: number; p_phash: string }
        Returns: {
          content_id: string
          created_at: string
          creator_id: string
          distance: number
          file_url: string
          fingerprint_id: string
          phash: string
          uploader_id: string
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_stream_key: { Args: never; Returns: string }
      generate_unique_username: { Args: { base_text: string }; Returns: string }
      get_creator_financial_data: {
        Args: { _creator_id: string }
        Returns: {
          bank_account_holder: string
          bank_bic: string
          bank_country: string
          bank_iban: string
          payment_frequency: string
          platform_commission_rate: number
          stripe_account_id: string
          stripe_account_status: string
          stripe_charges_enabled: boolean
          stripe_onboarding_completed: boolean
          stripe_payouts_enabled: boolean
          tax_id: string
          total_earnings: number
        }[]
      }
      get_my_identity_documents: {
        Args: never
        Returns: {
          birthdate: string
          document_type: string
          full_name: string
          id: string
          rejection_reason: string
          reviewed_at: string
          status: string
          submitted_at: string
        }[]
      }
      get_own_stream_key: { Args: { _live_stream_id: string }; Returns: string }
      get_public_creator_data: {
        Args: { creator_uuid: string }
        Returns: {
          category: string
          content_type: string[]
          created_at: string
          currency: string
          gender: string
          id: string
          is_accepting_tips: boolean
          is_featured: boolean
          orientation: string
          stage_name: string
          subscription_price: number
          total_content: number
          total_subscribers: number
        }[]
      }
      get_public_creator_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          created_at: string
          display_name: string
          id: string
          is_identity_verified: boolean
          is_verified: boolean
          location: string
          user_id: string
          username: string
          website: string
        }[]
      }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          created_at: string
          display_name: string
          id: string
          is_verified: boolean
          location: string
          user_id: string
          username: string
          website: string
        }[]
      }
      get_recidivist_users: {
        Args: { min_leaks?: number }
        Returns: {
          first_leak: string
          last_leak: string
          leak_count: number
          user_email: string
          user_id: string
          username: string
        }[]
      }
      has_live_access: {
        Args: { _live_stream_id: string; _subscriber_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_creator_noshow: {
        Args: { p_creator_id: string }
        Returns: undefined
      }
      is_active_creator: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_blocked: { Args: { check_identifier: string }; Returns: boolean }
      is_creator_by_user_id: {
        Args: { p_creator_id: string; p_user_id: string }
        Returns: boolean
      }
      is_creator_owner: {
        Args: { _creator_id: string; _user_id: string }
        Returns: boolean
      }
      is_creator_owner_by_user_id: {
        Args: { _creator_user_id: string }
        Returns: boolean
      }
      is_live_stream_creator: {
        Args: { _live_stream_id: string; _user_id: string }
        Returns: boolean
      }
      is_own_creator_profile: {
        Args: { _creator_id: string }
        Returns: boolean
      }
      is_subscribed_to_creator: {
        Args: { _creator_id: string; _subscriber_id: string }
        Returns: boolean
      }
      is_user_adult: { Args: { _user_id: string }; Returns: boolean }
      is_user_suspended: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      record_story_view: { Args: { p_story_id: string }; Returns: undefined }
      search_creators:
        | {
            Args: {
              category_filter?: string
              content_type_filter?: string[]
              featured_only?: boolean
              gender_filter?: string
              limit_count?: number
              offset_count?: number
              orientation_filter?: string
              price_filter?: string
              search_term?: string
            }
            Returns: {
              avatar_url: string
              bio: string
              category: string
              content_type: string[]
              created_at: string
              currency: string
              display_name: string
              gender: string
              id: string
              is_featured: boolean
              is_verified: boolean
              orientation: string
              similarity_score: number
              stage_name: string
              subscription_price: number
              total_content: number
              total_subscribers: number
              user_id: string
              username: string
            }[]
          }
        | {
            Args: {
              category_filter?: string
              featured_only?: boolean
              limit_count?: number
              offset_count?: number
              price_filter?: string
              search_term?: string
            }
            Returns: {
              avatar_url: string
              bio: string
              category: string
              created_at: string
              currency: string
              display_name: string
              id: string
              is_featured: boolean
              is_verified: boolean
              similarity_score: number
              stage_name: string
              subscription_price: number
              total_content: number
              total_subscribers: number
              user_id: string
              username: string
            }[]
          }
      toggle_content_like: { Args: { p_content_id: string }; Returns: Json }
    }
    Enums: {
      content_status: "draft" | "published" | "archived"
      content_type: "image" | "video"
      subscription_status: "active" | "expired" | "canceled"
      user_role: "admin" | "creator" | "subscriber"
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
      content_status: ["draft", "published", "archived"],
      content_type: ["image", "video"],
      subscription_status: ["active", "expired", "canceled"],
      user_role: ["admin", "creator", "subscriber"],
    },
  },
} as const
