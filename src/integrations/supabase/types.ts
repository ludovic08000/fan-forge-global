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
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
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
      creators: {
        Row: {
          bank_account_holder: string | null
          bank_bic: string | null
          bank_country: string | null
          bank_iban: string | null
          category: string | null
          content_type: string[] | null
          created_at: string | null
          currency: string | null
          featured_until: string | null
          gender: string | null
          id: string
          is_accepting_tips: boolean | null
          is_featured: boolean | null
          orientation: string | null
          platform_commission_rate: number | null
          stage_name: string | null
          subscription_price: number | null
          tax_id: string | null
          total_content: number | null
          total_earnings: number | null
          total_subscribers: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_country?: string | null
          bank_iban?: string | null
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          id?: string
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          orientation?: string | null
          platform_commission_rate?: number | null
          stage_name?: string | null
          subscription_price?: number | null
          tax_id?: string | null
          total_content?: number | null
          total_earnings?: number | null
          total_subscribers?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_country?: string | null
          bank_iban?: string | null
          category?: string | null
          content_type?: string[] | null
          created_at?: string | null
          currency?: string | null
          featured_until?: string | null
          gender?: string | null
          id?: string
          is_accepting_tips?: boolean | null
          is_featured?: boolean | null
          orientation?: string | null
          platform_commission_rate?: number | null
          stage_name?: string | null
          subscription_price?: number | null
          tax_id?: string | null
          total_content?: number | null
          total_earnings?: number | null
          total_subscribers?: number | null
          updated_at?: string | null
          user_id?: string
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
            referencedRelation: "creators"
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
        ]
      }
      live_stream_messages: {
        Row: {
          created_at: string | null
          id: string
          live_stream_id: string
          message: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          live_stream_id: string
          message: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          live_stream_id?: string
          message?: string
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
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_revenue_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
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
        ]
      }
      live_streams: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          ended_at: string | null
          id: string
          is_premium: boolean | null
          peak_viewer_count: number | null
          price: number | null
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
          ended_at?: string | null
          id?: string
          is_premium?: boolean | null
          peak_viewer_count?: number | null
          price?: number | null
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
          ended_at?: string | null
          id?: string
          is_premium?: boolean | null
          peak_viewer_count?: number | null
          price?: number | null
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
            referencedRelation: "creators"
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
      private_messages: {
        Row: {
          content: string | null
          created_at: string
          creator_id: string
          id: string
          is_paid: boolean | null
          media_thumbnail: string | null
          media_url: string | null
          message_type: string
          price: number | null
          stripe_payment_intent_id: string | null
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          creator_id: string
          id?: string
          is_paid?: boolean | null
          media_thumbnail?: string | null
          media_url?: string | null
          message_type?: string
          price?: number | null
          stripe_payment_intent_id?: string | null
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          is_paid?: boolean | null
          media_thumbnail?: string | null
          media_url?: string | null
          message_type?: string
          price?: number | null
          stripe_payment_intent_id?: string | null
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_verified: boolean | null
          location: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          website?: string | null
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
            referencedRelation: "creators"
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
            referencedRelation: "creators"
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
            referencedRelation: "creators"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_live_revenue: {
        Args: { _live_stream_id: string; _minute_number: number }
        Returns: undefined
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      generate_stream_key: { Args: never; Returns: string }
      generate_unique_username: { Args: { email: string }; Returns: string }
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
      is_subscribed_to_creator: {
        Args: { _creator_id: string; _subscriber_id: string }
        Returns: boolean
      }
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
