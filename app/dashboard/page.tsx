// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  profilesAPI,
  type Profile,
} from "@/utils/supabase/client";
import { EditProfileModal } from "@/components/EditProfileModal";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const user = await getCurrentUser();
        if (!user) {
          router.replace("/auth?mode=login");
          return;
        }

        const prof = await profilesAPI.getMyProfile();
        if (!cancelled) {
          setProfile(prof);
        }
      } catch (err: any) {
        console.error("Error loading dashboard:", err);
        if (!cancelled) {
          setError(err?.message ?? "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-300">Loading your dashboard…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="max-w-md w-full px-6 py-4 rounded-xl bg-slate-900 border border-slate-800">
          <h1 className="text-lg font-semibold mb-2">Dashboard error</h1>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-950 text-sm font-medium hover:bg-white/90"
          >
            Back to map
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {/* Top section: avatar + basic info */}
        <section className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-semibold">
            {profile?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {profile?.username || "New Explorer"}
            </h1>
            <p className="text-sm text-slate-400">
              {profile?.full_name || "Add your name"} ·{" "}
              <span className="text-slate-500">Profile</span>
            </p>
          </div>
        </section>

        {/* Bio + Edit */}
        <section className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">About you</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs px-3 py-1 rounded-full border border-slate-600 hover:border-slate-300 transition-colors"
            >
              Edit profile
            </button>
          </div>
          <p className="text-sm text-slate-300">
            {profile?.bio || "Add a short bio so people know who’s behind your trips."}
          </p>
        </section>

        {/* Placeholders */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold mb-2">Your posts</h3>
            <p className="text-xs text-slate-400">
              Later this will show your map posts and long-form trips.
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold mb-2">Your stories</h3>
            <p className="text-xs text-slate-400">
              Short-lived “snap” style stories will show up here when we build them.
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <h3 className="text-sm font-semibold mb-2">Saved & following</h3>
          <p className="text-xs text-slate-400">
            We’ll hook this up to your saved content, followers, and following once
            those tables exist.
          </p>
        </section>
      </div>

      <EditProfileModal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        initialProfile={profile}
        onSaved={(updated) => setProfile(updated)}
      />
    </main>
  );
}
