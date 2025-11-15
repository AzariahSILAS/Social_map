"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getCurrentUser,
  photosAPI,
  type Photo,
  profilesAPI,
  type Profile,
} from "@/utils/supabase/client";
import Image from "next/image";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myPhotos, setMyPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!mounted) return;

        setUser(currentUser);

        if (currentUser) {
          // load profile
          const p = await profilesAPI.getProfile(currentUser.id);
          if (!mounted) return;
          setProfile(p ?? null);

          // load photos and filter by user_id
          const allPhotos = await photosAPI.getAll();
          if (!mounted) return;
          const mine = allPhotos.filter(
  (photo) => photo.userId && photo.userId === currentUser.id,
);
          setMyPhotos(mine);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-slate-50">
        <p className="text-slate-400">Loading dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-slate-50">
        <p className="text-slate-300">
          You need to be logged in to view your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8 pb-24">
        {/* Profile header */}
        <section className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-semibold">
            {profile?.username?.[0]?.toUpperCase() ??
              user.email?.[0]?.toUpperCase() ??
              "U"}
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {profile?.username || user.email || "My Profile"}
            </h1>
            {profile?.bio && (
              <p className="text-sm text-slate-400 mt-1">{profile.bio}</p>
            )}
          </div>
        </section>

        {/* My Photos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Photos</h2>
            <span className="text-xs text-slate-400">
              {myPhotos.length} photo{myPhotos.length === 1 ? "" : "s"}
            </span>
          </div>

          {myPhotos.length === 0 ? (
            <p className="text-sm text-slate-400">
              You haven’t posted any photos yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {myPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-slate-800"
                >
                  <Image
                    src={photo.signedUrl}
                    alt="My photo"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
