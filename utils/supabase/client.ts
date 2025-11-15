// utils/supabase/client.ts
"use client";

import { createClient } from "@supabase/supabase-js";

// These come from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const edgeFunctionName = process.env.NEXT_PUBLIC_EDGE_FUNCTION_NAME!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase URL or ANON key missing. Check .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const serverUrl = `${supabaseUrl}/functions/v1/${edgeFunctionName}`;

export interface Marker {
  id: string;
  longitude: number;
  latitude: number;
  label: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  filePath: string;
  signedUrl: string;
  latitude: number;
  longitude: number;
  created_at: string;
  user_id?: string | null; // ✅ add this
}



/** ---------- AUTH + PROFILE HELPERS ---------- */

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export const profilesAPI = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as Profile) ?? null;
  },

  async getMyProfile(): Promise<Profile | null> {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }

    return (data as Profile) ?? null;
  },

  /** Create or update my profile row */
  async updateMyProfile(updates: {
    username?: string | null;
    full_name?: string | null;
    bio?: string | null;
  }): Promise<Profile> {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      throw new Error("Not authenticated");
    }

    // Upsert so it works even if the row doesn't exist yet
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          ...updates,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      throw error;
    }

    return data as Profile;
  },
};


/** ---------- MARKERS API (still here if you want later) ---------- */

export const markersAPI = {
  async getAll(): Promise<Marker[]> {
    const { data, error } = await supabase
      .from("markers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching markers:", error);
      throw error;
    }

    return (data as Marker[]) || [];
  },

  async add(longitude: number, latitude: number, label?: string): Promise<Marker> {
    const { data, error } = await supabase
      .from("markers")
      .insert([{ longitude, latitude, label: label || null }])
      .select()
      .single();

    if (error) {
      console.error("Error adding marker:", error);
      throw error;
    }

    return data as Marker;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("markers").delete().eq("id", id);

    if (error) {
      console.error("Error deleting marker:", error);
      throw error;
    }
  },
};

/** ---------- PHOTOS API (same behavior as before) ---------- */

export const photosAPI = {
  async upload(
    base64Data: string,
    filename: string,
    latitude: number,
    longitude: number,
  ): Promise<Photo> {
    // 🔐 get the current user session (for upload)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("You must be logged in to upload photos.");
    }

    const accessToken = session.access_token;

    const response = await fetch(`${serverUrl}/photos/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // user token for the edge function
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        base64Data,
        filename,
        latitude,
        longitude,
      }),
    });

    if (!response.ok) {
      let message = "Failed to upload photo";
      try {
        const error = await response.json();
        if (error?.error) message = error.error;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(message);
    }

    const data = await response.json();
    return {
      id: data.photoId,
      filePath: "",
      signedUrl: data.signedUrl,
      latitude: data.latitude,
      longitude: data.longitude,
      created_at: new Date().toISOString(),
      user_id: data.user_id ?? null,
    };
  },

  async getAll(): Promise<Photo[]> {
    const response = await fetch(`${serverUrl}/photos`, {
      headers: {
        // photos list is effectively public right now
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      let message = "Failed to fetch photos";
      try {
        const error = await response.json();
        if (error?.error) message = error.error;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(`${message} (status ${response.status})`);
    }

    const data = await response.json();
    return (data.photos as Photo[]) || [];
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${serverUrl}/photos/${id}`, {
      method: "DELETE",
      headers: {
        // delete endpoint doesn't check auth yet, this is just a bearer
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      let message = "Failed to delete photo";
      try {
        const error = await response.json();
        if (error?.error) message = error.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
  },
};


