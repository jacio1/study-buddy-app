import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/src/lib/supabase';
import { User, Profile } from '@/src/types/types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
  
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  isAuthenticated: () => boolean;
  hasProfile: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isInitialized: false,
      
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      
      initialize: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true });
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user as User || null;
          
          let profile = null;
          if (user) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            profile = data;
          }
          
          set({ 
            user, 
            profile, 
            isLoading: false, 
            isInitialized: true 
          });
          
          supabase.auth.onAuthStateChange(async (_event, session) => {
            const newUser = session?.user as User || null;
            set({ user: newUser });
            
            if (newUser) {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', newUser.id)
                .single();
              set({ profile: data });
            } else {
              set({ profile: null });
            }
          });
          
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false, isInitialized: true, user: null, profile: null });
        }
      },
      
      signOut: async () => {
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();
          set({ user: null, profile: null, isLoading: false });
        } catch (error) {
          console.error('Sign out error:', error);
          set({ isLoading: false });
        }
      },
      
      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;
        
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) set({ profile: data });
      },
      
      isAuthenticated: () => {
        return get().user !== null;
      },
      
      hasProfile: () => {
        return get().profile !== null;
      },
    }),
    {
      name: 'auth-storage', 
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile 
      }),
    }
  )
);