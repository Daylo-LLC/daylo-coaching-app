import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Tables } from "../types/database";

type Profile = Tables<"profiles">;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isApproved: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    schoolId: string,
  ) => Promise<{ error: string | null; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isApproved: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  setProfile: (profile) => {
    set({
      profile,
      isApproved: profile?.approval_status === "approved",
    });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      get().setProfile(data);
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    await get().fetchProfile();
    return { error: null };
  },

  signUp: async (email, password, firstName, lastName, schoolId) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          school_id: schoolId,
        },
      },
    });
    if (error) return { error: error.message };
    // Return success to indicate verification email was sent
    return { error: null, needsVerification: true };
  },

  verifyEmail: async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    if (error) return { error: error.message };

    // After verification, fetch the profile
    await get().fetchProfile();
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isApproved: false });
  },

  initialize: async () => {
    set({ isLoading: true });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      set({ session, user: session.user });
      await get().fetchProfile();
    }
    set({ isLoading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session) {
        get().fetchProfile();
      } else {
        set({ profile: null, isApproved: false });
      }
    });
  },
}));
