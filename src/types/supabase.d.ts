import { SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    supabase: SupabaseClient;
  }
}

export interface Database {
  public: {
    Tables: {
      google_auth_tokens: {
        Row: {
          id: string;
          tenant_id: string;
          access_token: string;
          refresh_token: string;
          expiry_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          access_token: string;
          refresh_token: string;
          expiry_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          access_token?: string;
          refresh_token?: string;
          expiry_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      google_business_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          display_name: string;
          account_name: string;
          type: string;
          location_count: number;
          primary_owner: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          account_id: string;
          display_name: string;
          account_name: string;
          type: string;
          location_count: number;
          primary_owner: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          account_id?: string;
          display_name?: string;
          account_name?: string;
          type?: string;
          location_count?: number;
          primary_owner?: string;
          role?: string;
          created_at?: string;
        };
      };
    };
  };
}

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from<T extends keyof Database['public']['Tables']>(
      table: T
    ): {
      select(columns?: string): {
        eq(column: string, value: any): {
          single(): Promise<{
            data: Database['public']['Tables'][T]['Row'] | null;
            error: Error | null;
          }>;
          order(column: string, options: { ascending: boolean }): Promise<{
            data: Database['public']['Tables'][T]['Row'][] | null;
            error: Error | null;
          }>;
        };
      };
      insert(data: Database['public']['Tables'][T]['Insert']): Promise<{
        error: Error | null;
      }>;
      update(data: Database['public']['Tables'][T]['Update']): {
        eq(column: string, value: any): Promise<{
          error: Error | null;
        }>;
      };
      delete(): {
        eq(column: string, value: any): Promise<{
          error: Error | null;
        }>;
      };
    };
  }
} 