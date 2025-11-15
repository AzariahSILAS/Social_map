// components/EditProfileModal.tsx
"use client";

import { useEffect, useState } from "react";
import { profilesAPI, type Profile } from "@/utils/supabase/client";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  initialProfile: Profile | null;
  onSaved: (profile: Profile) => void;
}

export function EditProfileModal({
  open,
  onClose,
  initialProfile,
  onSaved,
}: EditProfileModalProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync fields when modal opens / profile changes
  useEffect(() => {
    if (!open) return;
    setError(null);
    setUsername(initialProfile?.username ?? "");
    setFullName(initialProfile?.full_name ?? "");
    setBio(initialProfile?.bio ?? "");
  }, [open, initialProfile]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const updated = await profilesAPI.updateMyProfile({
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
      });

      onSaved(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-50">
            Edit profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Username
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourhandle"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Full name
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="What should people call you?"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Bio
            </label>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people what kind of adventures you like to map."
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-300 hover:border-slate-400 hover:text-slate-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
