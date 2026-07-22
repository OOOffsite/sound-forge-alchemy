/**
 * Tests: useSupabase Hook
 *
 * @description TDD tests for Supabase client access and auth state
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 * @phase RED - Write failing tests first
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSupabase } from '@/hooks/useSupabase';
import { mockSupabaseClient } from '../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

describe('useSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase - Failing Tests', () => {
    it('should return Supabase client instance', () => {
      const { result } = renderHook(() => useSupabase());

      expect(result.current.client).toBeDefined();
      expect(result.current.client).toBe(mockSupabaseClient);
    });

    it('should track auth state changes', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      let authCallback: ((event: string, session: any) => void) | undefined;

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useSupabase());

      // Initial state
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate sign in
      act(() => {
        authCallback?.('SIGNED_IN', { user: mockUser });
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should provide query helper for table access', () => {
      const { result } = renderHook(() => useSupabase());

      const query = result.current.from('tracks');

      expect(query).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tracks');
    });

    it('should provide storage helper', () => {
      const { result } = renderHook(() => useSupabase());

      const bucket = result.current.storage('audio-files');

      expect(bucket).toBeDefined();
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('audio-files');
    });

    it('should handle auth state cleanup on unmount', () => {
      const unsubscribeMock = vi.fn();

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } },
      });

      const { unmount } = renderHook(() => useSupabase());

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should handle sign in', async () => {
      const { result } = renderHook(() => useSupabase());

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: {} },
        error: null,
      });

      await act(async () => {
        await result.current.signIn(credentials);
      });

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith(credentials);
    });

    it('should handle sign out', async () => {
      const { result } = renderHook(() => useSupabase());

      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should handle auth errors gracefully', async () => {
      const authError = new Error('Invalid credentials');

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const { result } = renderHook(() => useSupabase());

      await waitFor(() => {
        expect(result.current.error).toEqual(authError);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should cache client instance across renders', () => {
      const { result, rerender } = renderHook(() => useSupabase());

      const firstClient = result.current.client;

      rerender();

      const secondClient = result.current.client;

      expect(firstClient).toBe(secondClient);
    });

    it('should update loading state correctly during auth checks', async () => {
      const { result } = renderHook(() => useSupabase());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
