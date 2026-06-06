/**
 * RACE-X Omniverse — Global Zustand Store
 * Single source of truth for user, UI, audio, theme state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface RxUser {
  id: string;
  phone_number: string;
  username: string;
  avatar_url: string | null;
  diamonds: number;
  rx_points: number;
  level: number;
  is_admin: boolean;
  role: UserRole;
}

export function isAdminRole(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role?: UserRole | null): boolean {
  return role === 'super_admin';
}

export type FestivalTheme = 'default' | 'diwali' | 'christmas' | 'eid' | 'newyear' | 'halloween';

interface RxStore {
  // User
  user: RxUser | null;
  setUser: (u: RxUser | null) => void;
  updateDiamonds: (delta: number) => void;

  // Theme
  festivalTheme: FestivalTheme;
  setFestivalTheme: (t: FestivalTheme) => void;

  // Audio
  ambientAudioEnabled: boolean;
  toggleAmbientAudio: () => void;

  // UI
  isLockdownMode: boolean;
  setLockdownMode: (v: boolean) => void;
  aiDirectorOpen: boolean;
  setAiDirectorOpen: (v: boolean) => void;

  // Render jobs badge count
  pendingRenderJobs: number;
  setPendingRenderJobs: (n: number) => void;

  // Notifications unread
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
  incrementUnread: () => void;

  // Omniverse UI preference
  omniverseView: 'floating' | 'card';
  setOmniverseView: (v: 'floating' | 'card') => void;
}

export const useRxStore = create<RxStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      updateDiamonds: (delta) =>
        set((s) => ({
          user: s.user ? { ...s.user, diamonds: Math.max(0, s.user.diamonds + delta) } : null,
        })),

      festivalTheme: 'default',
      setFestivalTheme: (t) => set({ festivalTheme: t }),

      ambientAudioEnabled: false,
      toggleAmbientAudio: () => set((s) => ({ ambientAudioEnabled: !s.ambientAudioEnabled })),

      isLockdownMode: false,
      setLockdownMode: (v) => set({ isLockdownMode: v }),

      aiDirectorOpen: false,
      setAiDirectorOpen: (v) => set({ aiDirectorOpen: v }),

      pendingRenderJobs: 0,
      setPendingRenderJobs: (n) => set({ pendingRenderJobs: n }),

      unreadNotifications: 0,
      setUnreadNotifications: (n) => set({ unreadNotifications: n }),
      incrementUnread: () => set((s) => ({ unreadNotifications: s.unreadNotifications + 1 })),

      omniverseView: 'floating',
      setOmniverseView: (v) => set({ omniverseView: v }),
    }),
    {
      name: 'race-x-store',
      partialize: (s) => ({
        user: s.user,
        festivalTheme: s.festivalTheme,
        ambientAudioEnabled: s.ambientAudioEnabled,
        omniverseView: s.omniverseView,
      }),
    }
  )
);
