/**
 * ============================================================
 * Cloudinary Configuration & Storage Helper
 * ============================================================
 * This module configures the Cloudinary SDK and exports a
 * pre-configured Multer storage engine (multer-storage-cloudinary)
 * that uploads images and videos directly to Cloudinary.
 *
 * Why Cloudinary?
 * ---------------
 * Render's free tier uses an ephemeral filesystem. Any files saved
 * to disk (e.g. ./uploads) are wiped on every server restart or
 * redeploy. By streaming files directly to Cloudinary we guarantee
 * persistence regardless of server state.
 *
 * Environment variables required (set in Render dashboard or .env):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 * ============================================================
 */

require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ------------------------------------------------------------------
// 1. Configure Cloudinary SDK with credentials from environment
// ------------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------------------------------------------------------
// 2. Create Multer storage engine backed by Cloudinary
// ------------------------------------------------------------------
// The storage engine decides *where* and *how* files are stored.
// Instead of writing to the local disk we stream bytes directly to
// Cloudinary's API.  The returned `req.file.path` is the secure
// HTTPS URL we save in MongoDB.
// ------------------------------------------------------------------
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,

  params: async (req, file) => {
    // Detect resource type from MIME type so Cloudinary handles
    // images and videos correctly (different pipelines, transforms,
    // and delivery URLs).
    const isVideo = file.mimetype.startsWith("video/");

    return {
      folder: "boostart",                 // Organise uploads in one folder
      resource_type: isVideo ? "video" : "image",
      allowed_formats: isVideo
        ? ["mp4", "mov", "avi", "webm"]
        : ["jpg", "jpeg", "png", "gif", "webp"],
      // Cloudinary public_id is derived from the original filename
      // (sanitised automatically by the SDK).
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

// ------------------------------------------------------------------
// 3. Helper: delete a media asset from Cloudinary by its URL
// ------------------------------------------------------------------
// When a post is deleted or its media is replaced we must also
// remove the asset from Cloudinary so we do not leak storage.
// This function extracts the public_id from a standard Cloudinary
// URL and calls the destroy API with the correct resource_type.
// ------------------------------------------------------------------
const deleteFromCloudinary = async (url) => {
  if (!url || typeof url !== "string") return;

  try {
    // Typical URL shape:
    // https://res.cloudinary.com/<cloud>/image/upload/v1234567890/boostart/123-file.jpg
    // We need the portion after `/upload/` (or `/upload/v123/`) → "boostart/123-file"
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/");

    // Find the index of "upload" and grab everything after it
    const uploadIdx = segments.indexOf("upload");
    if (uploadIdx === -1) return;

    // Remove optional version segment (e.g. v1234567890)
    let afterUpload = segments.slice(uploadIdx + 1);
    if (afterUpload[0] && afterUpload[0].startsWith("v")) {
      afterUpload.shift();
    }

    // Re-join and strip extension to get public_id
    const publicIdWithExt = afterUpload.join("/");
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // remove extension

    if (!publicId) return;

    // Determine resource_type from URL path (image or video)
    const resourceType = parsed.pathname.includes("/video/") ? "video" : "image";

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`☁️  Deleted from Cloudinary: ${publicId} (${resourceType})`);
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
    // Non-fatal: do not throw so post delete/update still succeeds
  }
};

module.exports = {
  cloudinary,
  storage,
  deleteFromCloudinary,
};

