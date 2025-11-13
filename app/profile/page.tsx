"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Loader2 } from "lucide-react";

interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1) Load auth user
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        // Not logged in -> send to auth
        router.replace("/auth");
        return;
      }

      setUser(data.user);
      setAuthLoading(false);
    };

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  // 2) Load profile row once we have a user
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        setErrorMsg("Could not load profile.");
      } else {
        setProfile(
          data || {
            id: user.id,
            username: null,
            full_name: null,
            bio: null,
            avatar_url: null,
          }
        );
      }

      setLoadingProfile(false);
    };

    void loadProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const updates = {
      id: user.id,
      username: profile.username,
      full_name: profile.full_name,
      bio: profile.bio,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      console.error("Error saving profile:", error);
      setErrorMsg("Failed to save profile. Please try again.");
    } else {
      setSuccessMsg("Profile saved.");
    }

    setSaving(false);
  };

  const isLoggedIn = !!user;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-50">
      <AppHeader
        isLoading={authLoading}
        user={user}
        onClickLogin={() => router.push("/auth")}
        onClickProfile={() => router.push("/profile")}
      />

      <main className="flex-1 overflow-y-auto px-4 py-6">
        {loadingProfile || !profile ? (
          <div className="flex items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading profile…</span>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <h1 className="text-lg font-semibold text-slate-100">
                Your Profile
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Update how you appear on Social Map.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Email
                </label>
                <div className="w-full rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                  {user?.email}
                </div>
                <p className="text-[11px] text-slate-500">
                  This comes from your login and can’t be changed here.
                </p>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, username: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
                  placeholder="e.g. azariah_travels"
                />
                <p className="text-[11px] text-slate-500">
                  This is what people will see on your posts and map pins.
                </p>
              </div>

              {/* Full name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Name
                </label>
                <input
                  type="text"
                  value={profile.full_name ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60"
                  placeholder="Your name"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Bio
                </label>
                <textarea
                  value={profile.bio ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/60 resize-none"
                  placeholder="Tell people what kind of spots you share: hidden beaches, city cafés, hiking trails..."
                />
              </div>

              {/* Messages */}
              {errorMsg && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/70 rounded-md px-3 py-2">
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900/70 rounded-md px-3 py-2">
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  "Save profile"
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      <AppFooter
        isLoggedIn={isLoggedIn}
        onClickFeed={() => router.push("/")}
        onClickCamera={() => router.push("/")} // MVP: go back home then open camera from there
      />
    </div>
  );
}
