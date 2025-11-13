// @ts-nocheck

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";
import * as kv from "@/kv_store.tsx";

const app = new Hono();

// ---------- Supabase setup ----------

// These MUST be set in your Supabase Edge Function env,
// not in .env.local (that file is for Next.js).
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env");
  throw new Error("Supabase env vars not configured for Edge Function");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// You can optionally set PHOTO_BUCKET in the function env.
// If not set, we fall back to the original name.
const PHOTO_BUCKET = Deno.env.get("PHOTO_BUCKET") ?? "make-ac2b2b01-photos";

// Prefix for all routes for this function (must match client)
const FUNCTION_PREFIX = "/make-server-ac2b2b01";

// ---------- Bucket bootstrap ----------

(async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Error listing buckets:", error);
      return;
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === PHOTO_BUCKET);
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(PHOTO_BUCKET, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      });

      if (createError) {
        console.error("Error creating storage bucket:", createError);
      } else {
        console.log(`✅ Created storage bucket: ${PHOTO_BUCKET}`);
      }
    }
  } catch (error) {
    console.error("Error creating storage bucket:", error);
  }
})();

// ---------- Middleware ----------

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ---------- Routes ----------

// Health check
app.get(`${FUNCTION_PREFIX}/health`, (c) => {
  return c.json({ status: "ok" });
});

// Upload photo
app.post(`${FUNCTION_PREFIX}/photos/upload`, async (c) => {
  try {
    const body = await c.req.json();
    const { base64Data, filename, latitude, longitude } = body ?? {};

    if (!base64Data || !filename || latitude === undefined || longitude === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Strip "data:image/jpeg;base64," prefix if present
    const base64WithoutPrefix = base64Data.split(",")[1] || base64Data;
    const binaryData = Uint8Array.from(atob(base64WithoutPrefix), (ch) =>
      ch.charCodeAt(0),
    );

    const filePath = `${Date.now()}-${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, binaryData, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    // Create signed URL (1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      return c.json(
        { error: `Failed to create signed URL: ${signedUrlError?.message}` },
        500,
      );
    }

    const photoId = `photo_${Date.now()}`;
    const createdAt = new Date().toISOString();

    // Store metadata in KV
    await kv.set(photoId, {
      id: photoId,
      filePath,
      signedUrl: signedUrlData.signedUrl,
      latitude,
      longitude,
      created_at: createdAt,
    });

    return c.json({
      success: true,
      photoId,
      signedUrl: signedUrlData.signedUrl,
      latitude,
      longitude,
      created_at: createdAt,
    });
  } catch (error) {
    console.error("Error in upload endpoint:", error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Get all photos
app.get(`${FUNCTION_PREFIX}/photos`, async (c) => {
  try {
    const photos = await kv.getByPrefix("photo_");
    return c.json({ photos });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return c.json({ error: `Failed to fetch photos: ${error.message}` }, 500);
  }
});

// Delete a photo
app.delete(`${FUNCTION_PREFIX}/photos/:id`, async (c) => {
  try {
    const photoId = c.req.param("id");
    const photo = await kv.get(photoId);

    if (!photo) {
      return c.json({ error: "Photo not found" }, 404);
    }

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([photo.filePath]);

    if (deleteError) {
      console.error("Storage deletion error:", deleteError);
      // We still proceed to delete from KV so we don't leak dangling metadata
    }

    // Delete metadata
    await kv.del(photoId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return c.json({ error: `Failed to delete photo: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);
