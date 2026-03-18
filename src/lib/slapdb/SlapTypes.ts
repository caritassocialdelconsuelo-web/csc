/* eslint-disable @typescript-eslint/no-explicit-any */
import { type SupabaseClient } from '@supabase/supabase-js';

export interface ICustomScriptCode {
  get sqlCode(): string;
  get codeDescription(): string;
}
export interface ICustomGeneratorID {
  generateId(): Promise<string | undefined>;
}
export interface IRealtimeSynchronize {
  runFullSync(supabase: SupabaseClient<any, any, 'public', any, any>): Promise<void>;
  realtimeSyncSetup(supabase: SupabaseClient<any, any, 'public', any, any>): Promise<void>;
  realtimeHandle(
    supabase: SupabaseClient<any, any, 'public', any, any>,
    payload: unknown,
  ): Promise<void>;
  handleOnline(supabase: SupabaseClient<any, any, 'public', any, any>): Promise<void>;
  handleOffline(): void;
}
