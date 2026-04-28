import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { StudyListing, StudySession, User, Profile } from "@/src/types/types";

export function useStudyData(user: User | null) {
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [activeSessions, setActiveSessions] = useState<StudySession[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);


  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  };

  const loadListings = async () => {
    const { data } = await supabase
      .from("study_listings")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setListings(data);
  };

    const loadActiveSessions = async (userId: string) => {
    const { data } = await supabase
      .from("study_sessions")
      .select("*, study_listings(*)")
      .or(`creator_id.eq.${userId},partner_id.eq.${userId}`)
      .in("status", ["active", "pending_confirmation"])
      .order("created_at", { ascending: false });
    if (data) setActiveSessions(data);
  };


   useEffect(() => {
    if (!user || hasLoaded) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadProfile(user.id),
        loadListings(),
        loadActiveSessions(user.id),
      ]);
      setLoading(false);
      setHasLoaded(true);
    };

    loadData();
  }, [user, hasLoaded]);

  const handleDeleted = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  return { listings, activeSessions, profile, loading, handleDeleted };
}
