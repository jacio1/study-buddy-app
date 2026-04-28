// src/hooks/useAuth.ts
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { User } from "@/src/types/types";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user as User || null);
      setInitialLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user as User || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setServerError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push("/");
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      setServerError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    username: string,
  ) => {
    setLoading(true);
    setServerError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: username },
        },
      });

      if (error) throw error;
      return {
        success: true,
        message: "Проверьте email для подтверждения регистрации",
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      setServerError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/auth");
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      setServerError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const clearServerError = () => setServerError(null);

  return {
    user,
    initialLoading,
    login,
    register,
    logout,
    loading,
    serverError,
    clearServerError,
  };
}