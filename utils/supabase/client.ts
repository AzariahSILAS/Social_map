import { createClient } from "@supabase/supabase-js";

// --- Environment variables --- //
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const edgeFunctionName =
  process.env.NEXT_PUBLIC_EDGE_FUNCTION_NAME ?? "make-server-ac2b2b01";

// Warn if missing keys
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Missing Supabase environment variables. Check .env.local.");
}

// Supabase client (browser safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// URL to your Supabase Edge Function
const serverUrl = `${supabaseUrl}/functions/v1/${edgeFunctionName}`;

// -----------------------------
//        Types
// -----------------------------
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
}

// -----------------------------
//        Marker API
// -----------------------------
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

    return data || [];
  },

  async add(
    longitude: number,
    latitude: number,
    label?: string
  ): Promise<Marker> {
    const { data, error } = await supabase
      .from("markers")
      .insert([{ longitude, latitude, label: label || null }])
      .select()
      .single();

    if (error) {
      console.error("Error adding marker:", error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("markers").delete().eq("id", id);

    if (error) {
      console.error("Error deleting marker:", error);
      throw error;
    }
  },
};

// -----------------------------
//        Photo API
// -----------------------------
export const photosAPI = {
  async upload(
    base64Data: string,
    filename: string,
    latitude: number,
    longitude: number
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
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload photo");
    }

    const data = await response.json();

    return {
      id: data.photoId,
      filePath: "",
      signedUrl: data.signedUrl,
      latitude: data.latitude,
      longitude: data.longitude,
      created_at: new Date().toISOString(),
    };
  },

    // Get all photos
  async getAll(): Promise<Photo[]> {
    const url = `${serverUrl}/photos`;
    console.log("📸 Fetching photos from:", url);

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });
    } catch (networkError) {
      console.error("🌐 Network error while fetching photos:", networkError);
      throw new Error("Network error while fetching photos");
    }

    const rawBody = await response.text();
    console.log("📸 Photos response:", {
      status: response.status,
      ok: response.ok,
      body: rawBody,
    });

    if (!response.ok) {
      // Try to parse JSON error if possible
      try {
        const errorJson = JSON.parse(rawBody);
        throw new Error(errorJson.error || "Failed to fetch photos");
      } catch {
        throw new Error(`Failed to fetch photos (status ${response.status})`);
      }
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch (jsonErr) {
      console.error("❌ Failed to parse photos JSON:", jsonErr);
      throw new Error("Invalid JSON while fetching photos");
    }

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
      const error = await response.json();
      throw new Error(error.error || "Failed to delete photo");
    }
  },
};
