import { useEffect, useState, useRef } from "react";
import { supabase } from "@/src/lib/supabase";
import { StudyListing, StudySession, User, Profile } from "@/src/types/types";

export function useStudyData(user: User | null) {
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [activeSessions, setActiveSessions] = useState<StudySession[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef<string | undefined>(undefined); 

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 0);
      hasLoadedRef.current = undefined;
      return () => clearTimeout(timer);
    }

    if (hasLoadedRef.current === user.id) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    hasLoadedRef.current = user.id;

    const loadData = async () => {
      setLoading(true);
      
      try {
        const [profileRes, listingsRes, sessionsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase
            .from("study_listings")
            .select("*, profiles(*)")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("study_sessions")
            .select("*, study_listings(*)")
            .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
            .in("status", ["active", "pending_confirmation"])
            .order("created_at", { ascending: false })
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        if (listingsRes.data) setListings(listingsRes.data);
        if (sessionsRes.data) setActiveSessions(sessionsRes.data);
      } catch (error) {
        console.error("Error loading study data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]); 

  const handleDeleted = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  return { listings, activeSessions, profile, loading, handleDeleted };
}