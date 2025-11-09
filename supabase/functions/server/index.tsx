// @ts-nocheck
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";
import * as kv from "@/kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket name for photos
const PHOTO_BUCKET = "make-ac2b2b01-photos";

// Create storage bucket on startup
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === PHOTO_BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(PHOTO_BUCKET, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      console.log(`Created storage bucket: ${PHOTO_BUCKET}`);
    }
  } catch (error) {
    console.error("Error creating storage bucket:", error);
  }
})();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
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

// Health check endpoint
app.get("/make-server-ac2b2b01/health", (c) => {
  return c.json({ status: "ok" });
});

// Upload photo endpoint
app.post("/make-server-ac2b2b01/photos/upload", async (c) => {
  try {
    const body = await c.req.json();
    const { base64Data, filename, latitude, longitude } = body;

    if (!base64Data || !filename || latitude === undefined || longitude === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Decode base64 to binary
    const base64WithoutPrefix = base64Data.split(',')[1] || base64Data;
    const binaryData = Uint8Array.from(atob(base64WithoutPrefix), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const filePath = `${Date.now()}-${filename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, binaryData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    // Create signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(filePath, 31536000); // 1 year in seconds

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return c.json({ error: `Failed to create signed URL: ${signedUrlError.message}` }, 500);
    }

    // Store photo metadata in KV store
    const photoId = `photo_${Date.now()}`;
    await kv.set(photoId, {
      id: photoId,
      filePath,
      signedUrl: signedUrlData.signedUrl,
      latitude,
      longitude,
      created_at: new Date().toISOString(),
    });

    return c.json({
      success: true,
      photoId,
      signedUrl: signedUrlData.signedUrl,
      latitude,
      longitude,
    });
  } catch (error) {
    console.error("Error in upload endpoint:", error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Get all photos endpoint
app.get("/make-server-ac2b2b01/photos", async (c) => {
  try {
    const photos = await kv.getByPrefix("photo_");
    return c.json({ photos });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return c.json({ error: `Failed to fetch photos: ${error.message}` }, 500);
  }
});

// Delete photo endpoint
app.delete("/make-server-ac2b2b01/photos/:id", async (c) => {
  try {
    const photoId = c.req.param("id");
    const photo = await kv.get(photoId);

    if (!photo) {
      return c.json({ error: "Photo not found" }, 404);
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([photo.filePath]);

    if (deleteError) {
      console.error("Storage deletion error:", deleteError);
    }

    // Delete from KV store
    await kv.del(photoId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return c.json({ error: `Failed to delete photo: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);