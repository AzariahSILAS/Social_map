// utils/supabase/client.ts
"use client";

import { createClient } from "@supabase/supabase-js";

// ---------- ENV + CLIENT ----------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const edgeFunctionName = process.env.NEXT_PUBLIC_EDGE_FUNCTION_NAME!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase URL or ANON key missing. Check .env.local / Vercel env.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const serverUrl = `${supabaseUrl}/functions/v1/${edgeFunctionName}`;

// ---------- TYPES ----------

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
  userId: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

// ---------- AUTH HELPERS ----------

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

// ---------- PROFILES API ----------

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

// ---------- MARKERS API (optional) ----------

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

// ---------- PHOTOS API ----------

export const photosAPI = {
  async upload(
    base64Data: string,
    filename: string,
    latitude: number,
    longitude: number,
    userId?: string,
  ): Promise<Photo> {
    const response = await fetch(`${serverUrl}/photos/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        base64Data,
        filename,
        latitude,
        longitude,
        userId, // sent to the Edge Function
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
      filePath: data.filePath ?? "",
      signedUrl: data.signedUrl,
      latitude: data.latitude,
      longitude: data.longitude,
      userId: userId ?? data.userId ?? null,
      created_at: data.created_at ?? new Date().toISOString(),
    };
  },

  async getAll(): Promise<Photo[]> {
    const response = await fetch(`${serverUrl}/photos`, {
      headers: {
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
    // Each item from KV should already have userId if the edge function was updated
    return (data.photos as Photo[]) || [];
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${serverUrl}/photos/${id}`, {
      method: "DELETE",
      headers: {
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
