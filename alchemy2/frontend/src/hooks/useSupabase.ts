/**
 * Hook: useSupabase
 *
 * @description Provides Supabase client access with auth state management
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase GREEN - Minimal implementation to pass tests
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, PostgrestFilterBuilder } from '@supabase/supabase-js';

/**
 * Sign in credentials
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Hook return value
 */
export interface UseSupabaseReturn {
  client: typeof supabase;
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  from: (table: string) => PostgrestFilterBuilder<any, any, any>;
  storage: (bucket: string) => ReturnType<typeof supabase.storage.from>;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Custom hook for Supabase client access and auth state
 *
 * @returns Supabase client, auth state, and helper methods
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, signIn, signOut } = useSupabase();
 *
 * if (!isAuthenticated) {
 *   return <SignInForm onSubmit={signIn} />;
 * }
 * ```
 */
export function useSupabase(): UseSupabaseReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check current auth state
    const checkUser = async () => {
      try {
        setLoading(true);
        const { data, error: userError } = await supabase.auth.getUser();

        if (userError) {
          setError(userError);
          setUser(null);
        } else {
          setUser(data.user);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Query helper for table access
   */
  const from = (table: string) => {
    return supabase.from(table);
  };

  /**
   * Storage helper for bucket access
   */
  const storage = (bucket: string) => {
    return supabase.storage.from(bucket);
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (credentials: SignInCredentials) => {
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword(credentials);

      if (signInError) {
        setError(signInError);
        throw signInError;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign in failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError);
        throw signOutError;
      }

      setUser(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    client: supabase,
    user,
    loading,
    error,
    isAuthenticated: !!user,
    from,
    storage,
    signIn,
    signOut,
  };
}
